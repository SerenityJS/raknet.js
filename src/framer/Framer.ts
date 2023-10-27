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
  Nack,
} from '../packets'
import { PacketPriority, PacketReliability } from '../constants'

const GameByte = 0xfe

class Framer {
  private readonly raknet: Raknet
  private readonly client: Client

  // Frame Queue
  public outFrameQueue = new FrameSet()
  public outFrame = 0
  public outFrameReliability = 0
  public outFrameFragmentIndex = 0
  public readonly outFrameBackupQueue = new Map<number, Frame[]>()
  public readonly outFrameOrderIndex: number[] = new Array(32).fill(0)
  public readonly outFrameSequenceIndex: number[] = new Array(32).fill(0)

  // Fragments
  public readonly fragmentQueue: Map<number, Map<number, Frame>> = new Map()

  // Frames
  public readonly receivedFrames = new Set<number>()
  public readonly lostFrames = new Set<number>()
  public lastFrame = -1

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

  public addFrameToQueue(frame: Frame, priority: PacketPriority = PacketPriority.Normal): void {
    let length = 4
    // Checks if the frame size is larger then the mtu size.
    for (const x of this.outFrameQueue?.frames ?? []) length += x.getByteLength()
    if (length + frame.getByteLength() > this.client.mtuSize - 36) this.sendFrameQueue()
    // Sets the frames of the frame queue.
    if (!this.outFrameQueue.frames) this.outFrameQueue.frames = []
    this.outFrameQueue.frames.push(frame)
    // If the priority is immediate, send the frame queue.
    if (priority === PacketPriority.Immediate) return this.sendFrameQueue()
  }

  public sendFrameQueue(): void {
    // Checks if there are any frames in the queue, if not, return.
    if (!this.outFrameQueue?.frames?.length) return
    // Set the sequence of the frame queue.
    this.outFrameQueue.sequence = this.outFrame++
    // Send the frame queue.
    this.sendFrameSet(this.outFrameQueue)
    // Set the frame queue to a new frame set.
    this.outFrameQueue = new FrameSet()
  }

  public sendFrameSet(frameSet: FrameSet): void {
    // Send the frame set.
    this.client.send(frameSet.serialize())
    // Set the frame set to the backup queue.
    this.outFrameBackupQueue.set(frameSet.sequence, frameSet.frames.filter(x => x.isReliable()))
  }

  public handleFrameSet(frameSet: FrameSet): void {
    if (this.receivedFrames.has(frameSet.sequence)) return console.log('TODO: Handle duplicate frame set')

    this.lostFrames.delete(frameSet.sequence)

    if (
      frameSet.sequence < this.lastFrame ||
      frameSet.sequence === this.lastFrame
    ) return console.log('TODO: Handle out of order frame set')

    this.receivedFrames.add(frameSet.sequence)
    const difference = frameSet.sequence - this.lastFrame

    if (difference !== 1) {
      for (let i = this.lastFrame + 1; i < frameSet.sequence; i++) {
        if (!this.receivedFrames.has(i)) {
          this.lostFrames.add(i)
        }
      }
    }

    this.lastFrame = frameSet.sequence

    for (const frame of frameSet.frames) {
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
          for (let i = 0; i < value.size; i++) {
            const split = value.get(i)!
            stream.write(split.body)
          }

          // Build the new frame
          const newFrame = new Frame()
          newFrame.body = stream.getBuffer()
          newFrame.reliability = frame.reliability
          newFrame.reliableIndex = frame.reliableIndex
          newFrame.sequenceIndex = frame.sequenceIndex
          newFrame.orderingIndex = frame.orderingIndex
          newFrame.orderingChannel = frame.orderingChannel
          this.fragmentQueue.delete(frame.fragmentId)

          return this.handleFrame(newFrame)
        }
      }
    } else if (frame.isSequenced()) {
      if (
        frame.sequenceIndex < this.inHighestIndex[frame.orderingChannel] ||
        frame.orderingIndex < this.inOrderingIndex[frame.orderingChannel]
        ) return
        console.log('got here')
        this.inHighestIndex[frame.orderingChannel] = frame.sequenceIndex + 1
        this.handlePacket(frame)
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

  public async handlePacket(frame: Frame): Promise<void> {
    switch(frame.body[0]) {
      default:
        this.raknet.emit('Encapsulated', frame.body, this.client)
        break
      case ConnectionRequest.id:
        return this.handleConnectionRequest(new ConnectionRequest(frame.body).deserialize())
      case ConnectedPing.id:
        return this.handleConnectedPing(new ConnectedPing(frame.body).deserialize())
      case NewIncomingConnection.id:
        return this.handleNewIncomingConnection()
      case Disconnect.id:
        return this.handleDisconnect()
    }
  }

  public handleAck(ack: Ack): void {
    for (const sequence of ack.sequences) {
      this.outFrameBackupQueue.delete(sequence)
    }
  }

  public handleNack(nack: Nack): void {
    for (const sequence of nack.sequences) {
      console.log('TODO Nack', sequence)
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

    this.client.sendFrame(accepted.serialize(), 1)
  }

  public async handleConnectedPing(ping: ConnectedPing): Promise<void> {
    // Construct the connected pong packet.
    const pong = new ConnectedPong()
    pong.pingTime = ping.time
    pong.pongTime = BigInt(Date.now())
    this.client.sendFrame(pong.serialize())
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