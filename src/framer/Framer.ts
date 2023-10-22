import type { Raknet } from '../Raknet'

import { Client, ClientStatus } from '../client'
import { BinaryStream } from 'binarystream.js'
import {
  Frame,
  FrameSet,
  Ack,
  ConnectionRequest,
  ConnectionRequestAccepted,
  ConnectedPing,
  ConnectedPong,
  NewIncomingConnection,
  Disconnect,
} from '../packets'
import { PacketReliability } from '../constants'

const GameByte = 0xfe

class Framer {
  private readonly raknet: Raknet
  private readonly client: Client

  // Fragments
  public readonly fragmentQueue: Map<number, Map<number, Frame>> = new Map()

  // Frames
  public readonly receivedFrames = new Set<number>()
  public readonly lostFrames = new Set<number>()
  public lastFrame = -1
  public outFrameSets = new Map<number, { frameSet: FrameSet, ping: bigint }>()
  public outFrameReliability = 0
  public outFrame = 0

  // Ordering
  public readonly inOrderingQueue = new Map<number, Map<number, Frame>>()
  public readonly inOrderingIndex: number[] = new Array(32).fill(0)
  public readonly inHighestIndex: number[] = new Array(32).fill(0)

  public constructor(raknet: Raknet, client: Client) {
    this.raknet = raknet
    this.client = client

    // Fill the ordering queue
    for (let i = 0; i < 32; i++) {
      this.inOrderingQueue.set(i, new Map())
    }
  }

  public handleFrameSet(frameSet: FrameSet): void {
    // Checks if the frame set is a duplicate
    if (this.receivedFrames.has(frameSet.sequence)) {
      this.raknet.emit('Error', `Received duplicate frame set ${frameSet.sequence} from ${this.client.remote.address}:${this.client.remote.port}`)
      return
    }

    // If the frame was marked as lost, remove it from the lost frames set.
    if (this.lostFrames.has(frameSet.sequence))
      this.lostFrames.delete(frameSet.sequence)

    // Checks if the frame is out of order
    if (
      frameSet.sequence < this.lastFrame &&
      this.lastFrame - frameSet.sequence < 32
    ) {
      this.raknet.emit('Error', `Received out of order frame set ${frameSet.sequence} from ${this.client.remote.address}:${this.client.remote.port}`)
      return
    }

    // Checks if the frame is too old
    if (frameSet.sequence < this.lastFrame - 32) {
      this.raknet.emit('Error', `Received too old frame set ${frameSet.sequence} from ${this.client.remote.address}:${this.client.remote.port}`)
      return
    }

    // Add the frame set to the received frames set
    this.receivedFrames.add(frameSet.sequence)

    // Checks if the frame set is the next frame set
    if ((frameSet.sequence - this.lastFrame) !== 1) {
      // Add the lost frame to the lost frames set
      for (let i = 1; i < (frameSet.sequence - this.lastFrame); i++) {
        this.lostFrames.add(this.lastFrame + i)
      }
    }

    // Updates the last frame
    this.lastFrame = frameSet.sequence

    // Handle the frames
    for (const frame of frameSet.frames.values()) {
      this.handleFrame(frame)
    }
  }

  public async handleFrame(frame: Frame): Promise<void> {
    // Checks if the frames if fragmented
    if (frame.isFragmented()) {
      // Checks if the queue has the fragment
      if (!this.fragmentQueue.has(frame.fragmentId)) {
        // Creates and sets the fragment queue
        this.fragmentQueue.set(frame.fragmentId, new Map([[frame.fragmentIndex, frame]]))
      } else {
        const value = this.fragmentQueue.get(frame.fragmentId)!
        value.set(frame.fragmentIndex, frame)

        // Checks if the fragment queue is complete
        if (value.size === frame.fragmentSize) {
          const stream = new BinaryStream()
          for (let i = 0; i < frame.fragmentSize; i++) {
            const split = value.get(i)!
            stream.write(split.body)
          }

          // Build the new frame
          const newFrame = new Frame()
          newFrame.body = stream.getBuffer()
          newFrame.reliability = frame.reliability
          newFrame.orderingChannel = frame.orderingChannel
          newFrame.orderingIndex = frame.orderingIndex
          newFrame.sequenceIndex = frame.sequenceIndex
          newFrame.reliableIndex = frame.reliableIndex
          this.fragmentQueue.delete(frame.fragmentId)
          
          return this.handleFrame(newFrame)
        }
      }
    } else if (frame.isSequenced()) {
      if (frame.sequenceIndex < this.inHighestIndex[frame.orderingChannel] || frame.orderingIndex < this.inOrderingIndex[frame.orderingChannel]) {
        this.raknet.emit('Error', `Received out of order sequenced frame ${frame.sequenceIndex} from ${this.client.remote.address}:${this.client.remote.port}`)
        return
      }
    } else if (frame.isOrdered()) {
      if (frame.orderingIndex === this.inOrderingIndex[frame.orderingChannel]) {
        this.inHighestIndex[frame.orderingChannel] = 0
        this.inOrderingIndex[frame.orderingChannel] = frame.orderingIndex + 1

        this.handlePacket(frame)
        let i = this.inOrderingIndex[frame.orderingChannel]
        const outOfOrderQueue = this.inOrderingQueue.get(frame.orderingChannel)!
        for (; outOfOrderQueue.has(i); i++) {
          const frame = outOfOrderQueue.get(i)!
          this.handlePacket(frame)
          outOfOrderQueue.delete(i)
        }

        this.inOrderingQueue.set(frame.orderingChannel, outOfOrderQueue)
        this.inOrderingIndex[frame.orderingChannel] = i
      } else if (frame.orderingIndex > this.inOrderingIndex[frame.orderingChannel]) {
        const unorderedQueue = this.inOrderingQueue.get(frame.orderingChannel)!
        unorderedQueue.set(frame.orderingIndex, frame)
      }
    } else {
      return this.handlePacket(frame)
    }
  }

  public framePacket(buffer: Buffer): FrameSet | void {
    // Create the new frame
    const frame = new Frame()
    frame.reliability = PacketReliability.Unreliable
    frame.orderingChannel = 0
    frame.body = buffer
    // TODO: handle sequence
    if (frame.isSequenced()) return console.log('Sequenced packets are not supported yet.')
    if (frame.isOrderExclusive()) return console.log('Order exclusive packets are not supported yet.')

    frame.reliability = this.outFrameReliability++

    const mtu = this.client.mtuSize - 6 - 23
    // TODO: handle fragmentation
    if (frame.body.byteLength > mtu) return console.log('Fragmentation is not supported yet.')

    // Create the new frame set
    const frameSet = new FrameSet()
    frameSet.sequence = this.outFrame++
    frameSet.frames = [frame]

    // Add the frame set to the out frame sets
    this.outFrameSets.set(frameSet.sequence, { frameSet, ping: BigInt(Date.now()) })

    return frameSet
  }

  public async handlePacket(frame: Frame): Promise<void> {
    switch(frame.body[0]) {
      default:
        this.raknet.emit('Error', `Unhandled packet with id 0x${frame.body[0].toString(16)} from ${this.client.remote.address}:${this.client.remote.port}`)
        break
      case ConnectionRequest.id:
        return this.handleConnectionRequest(new ConnectionRequest(frame.body).deserialize())
      case ConnectedPing.id:
        return this.handleConnectedPing(new ConnectedPing(frame.body).deserialize())
      case NewIncomingConnection.id:
        return this.handleNewIncomingConnection()
      case Disconnect.id:
        return this.handleDisconnect()
      case GameByte:
        this.raknet.emit('Encapsulated', frame.body, this.client)
        break
    }
  }

  public handleAck(ack: Ack): void {
    for (const sequence of ack.sequences) {
      const entry = this.outFrameSets.get(sequence)
      if (!entry) {
        this.raknet.emit('Error', `Received ack for unknown sequence ${sequence} from ${this.client.remote.address}:${this.client.remote.port}`)
        return
      }
      this.outFrameSets.delete(sequence)
      // TODO: possible to make better?
      if (entry.ping) {
        const pingTime = Number(entry.ping)
        const current = Number(BigInt(Date.now()))
        this.client.ping = current - pingTime
      }
    }
  }

  public async handleConnectionRequest(request: ConnectionRequest): Promise<void> {
    // Emit the connection request event, if not, return.
    const event = await this.raknet.emit('ConnectionRequest', request, this.client)
    if (!event) return
    // Construct the connection request accepted packet.
    const accepted = new ConnectionRequestAccepted()
    accepted.clientAddress = { address: this.client.remote.address, port: this.client.remote.port, version: 4 }
    accepted.requestTime = request.time
    accepted.time = BigInt(Date.now())
    // Frame the packet
    const frameSet = this.framePacket(accepted.serialize())
    if (!frameSet) {
      this.raknet.emit('Error', 'Failed to frame connection request accepted packet.')
      return
    }
    // Send the connection request accepted packet to the client.
    this.client.send(frameSet.serialize())
  }

  public async handleConnectedPing(ping: ConnectedPing): Promise<void> {
    // Construct the connected pong packet.
    const pong = new ConnectedPong()
    pong.pingTime = ping.time
    pong.pongTime = BigInt(Date.now())
    // Frame the packet
    const frameSet = this.framePacket(pong.serialize())
    if (!frameSet) {
      this.raknet.emit('Error', 'Failed to frame connected pong packet.')
      return
    }
    // Send the connected pong packet to the client.
    this.client.send(frameSet.serialize())
  }

  public async handleNewIncomingConnection(): Promise<void> {
    // Set the client status to connected.
    this.client.status = ClientStatus.Connected
    // Emit the new incoming connection event, if not, return.
    const event = await this.raknet.emit('ClientConnected', this.client)
    if (event) return
    // Set the client status to disconnecting.
    this.client.status = ClientStatus.Disconnecting
  }

  public handleDisconnect(): void {
    // Set the client status to disconnecting.
    this.client.status = ClientStatus.Disconnecting
    // Handle the disconnection of the client.
    return this.client.disconnect()
  }
}

export {
  Framer,
}