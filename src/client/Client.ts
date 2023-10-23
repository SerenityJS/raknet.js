import type { RemoteInfo } from 'node:dgram'
import type { Raknet } from '../Raknet'

import { Bitflags, PacketPriority } from '../constants'
import { Framer } from '../framer'
import {
  Ack,
  Nack,
  FrameSet,
  Disconnect,
  Frame,
} from '../packets'

enum ClientStatus {
  Connecting,
  Connected,
  Disconnecting,
  Disconnected,
}

class Client {
  private readonly raknet: Raknet
  public readonly remote: RemoteInfo
  public readonly guid: bigint
  public readonly mtuSize: number
  public readonly framer: Framer

  public status: ClientStatus = ClientStatus.Connecting
  public ping = 0

  public constructor(raknet: Raknet, remote: RemoteInfo, guid: bigint, mtuSize: number) {
    this.raknet = raknet
    this.remote = remote
    this.guid = guid
    this.mtuSize = mtuSize
    this.framer = new Framer(raknet, this)
  }

  public send(buffer: Buffer): void {
    this.raknet.send(buffer, this.remote.address, this.remote.port)
  }

  public async incoming(buffer: Buffer): Promise<void> {
    // Shift the packet id
    const shift = buffer[0] & 0xf0
    switch(shift) {
      default:
        this.raknet.emit('Error', `Unhandled packet with id 0x${shift.toString(16)} from ${this.remote.address}:${this.remote.port}`)
        break
      case Ack.id:
        return this.framer.handleAck(new Ack(buffer).deserialize())
      case Nack.id:
        return this.framer.handleNack(new Nack(buffer).deserialize())
      case Bitflags.Valid:
        this.framer.handleFrameSet(new FrameSet(buffer).deserialize())
        return
    }
  }

  /**
   * Dont use the method to disconncet a in game client, use the games disconnect packet instead.
   */
  public disconnect(): void {
    // Checks if the client is already disconnecting, or if we are disconnecting them.
    if (this.status !== ClientStatus.Disconnecting) {
      // Set the status to disconnecting, sense we are disconnecting them.
      this.status = ClientStatus.Disconnecting
      // Create the disconnect packet
      // TODO: figure out why this is not working
      const disconnect = new Disconnect()
      // Frame the packet
      this.sendFrame(disconnect.serialize(), PacketPriority.Immediate)
    } else {
      // Set the status to disconnected since the client itself disconnected.
      this.status = ClientStatus.Disconnected
    }
    // Emit the client disconnected event
    this.raknet.emit('ClientDisconnected', this, this.status)
    // Delete the client from the raknet clients map
    this.raknet.clients.delete(this.guid)
  }

  public tick(): void {
    // Handle Ack
    if (this.framer.receivedFrames.size > 0) {
      const ack = new Ack()
      const sequences = [...this.framer.receivedFrames].map((x) => {
        this.framer.receivedFrames.delete(x)

        return x
      })
      ack.sequences = sequences
      this.send(ack.serialize())
    }
    // Handle Nack
    if (this.framer.lostFrames.size > 0) {
      const nack = new Nack()
      const sequences = [...this.framer.lostFrames].map((x) => {
        this.framer.lostFrames.delete(x)

        return x
      })
      nack.sequences = sequences
      this.send(nack.serialize())
    }
    // Send the frame queue
    this.framer.sendFrameQueue()
  }

  public sendFrame(buffer: Buffer, priority: PacketPriority = PacketPriority.Normal): void {
    // Create Frame
    const frame = new Frame()
    frame.reliability = 0
    frame.orderingChannel = 0
    frame.body = buffer

    // Checks if the frame is sequenced or ordered, if so, set the index.
    if (frame.isSequenced()) {
      frame.orderingIndex = this.framer.outFrameOrderIndex[frame.orderingChannel]
      frame.sequenceIndex = this.framer.outFrameSequenceIndex[frame.orderingChannel]++
    } else if (frame.isOrderExclusive()) {
      frame.orderingIndex = this.framer.outFrameOrderIndex[frame.orderingChannel]++
      this.framer.outFrameOrderIndex[frame.orderingChannel]  = 0
    }
    // Set the reliability index to the current reliability index.
    frame.reliableIndex = this.framer.outFrameReliability++
    // Fragment the frame if it is larger then the mtu size.
    const maxMtuSize = this.mtuSize - 6 - 23
    if (frame.body.byteLength > maxMtuSize) {
      const buffer = Buffer.from(frame.body)
      const fragmentId = this.framer.outFrameFragmentIndex++ % 65536
      for (let i = 0; i < buffer.byteLength; i += maxMtuSize) {
        if (i !== 0) frame.reliableIndex = this.framer.outFrameReliability++
        frame.body = buffer.slice(i, i + maxMtuSize)
        frame.fragmentIndex = i / maxMtuSize
        frame.fragmentId = fragmentId
        frame.fragmentSize = Math.ceil(buffer.byteLength / maxMtuSize)
        this.framer.addFrameToQueue(frame, priority)
      }
    } else {
      this.framer.addFrameToQueue(frame, priority)
    }
  }
}

export {
  Client,
  ClientStatus,
}
