import type { RemoteInfo } from 'node:dgram'
import type { Raknet } from '../Raknet'

import { Bitflags } from '../constants'
import { Framer } from '../framer'
import {
  Ack,
  FrameSet,
  Disconnect,
} from '../packets'
import { BinaryStream } from 'binarystream.js'

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
      case 0xa0:
        this.raknet.emit('Error', 'TODO: Handle NACK')
        break
      case Bitflags.Valid:
        return this.framer.handleFrameSet(new FrameSet(buffer).deserialize())
    }
  }

  public disconnect(): void {
    // Checks if the client is already disconnecting, or if we are disconnecting them.
    if (this.status !== ClientStatus.Disconnecting) {
      // Set the status to disconnecting, sense we are disconnecting them.
      this.status = ClientStatus.Disconnecting
      // Create the disconnect packet
      const disconnect = new Disconnect()
      // Frame the packet
      const frameSet = this.framer.framePacket(disconnect.serialize())
      if (!frameSet) {
        this.raknet.emit('Error', 'Failed to frame disconnect packet.')
        return
      }
      // Send it to the client
      this.send(frameSet.serialize())
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
    if (this.framer.receivedFrames.size > 0) {
      const ack = new Ack()
      const sequences = [...this.framer.receivedFrames].map((x) => {
        this.framer.receivedFrames.delete(x)

        return x
      })
      ack.sequences = sequences
      this.send(ack.serialize())
    }
  }
}

export {
  Client,
  ClientStatus,
}
