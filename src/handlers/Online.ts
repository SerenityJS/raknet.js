import type { Connection } from '../connection'
import type { Raknet } from '../Raknet'
import type { BasePacket } from '../packets'

import { Bitflags, PacketReliability, RaknetEvent } from '../constants'
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
  GamePacket,
} from '../packets'

class OnlineHandler {
  private readonly connection: Connection
  private readonly raknet: Raknet

  // Frames
  public readonly receivedFrames: Set<number>
  public readonly lostFrames: Set<number> 
  public lastFrame: number
  public outReliabilityIndex
  public outFrame
  public outFrameSets: Map<number, { frameSet: FrameSet, ping: bigint }>

  // Ordering
  public readonly inOrderingQueue: Map<number, Map<number, Frame>>
  public readonly inHighestIndex: number[]
  public readonly inOrderingIndex: number[]

  public constructor(connection: Connection, raknet: Raknet) {
    this.connection = connection
    this.raknet = raknet

    // Frames
    this.receivedFrames = new Set()
    this.lostFrames = new Set()
    this.lastFrame = -1
    this.outReliabilityIndex = 0
    this.outFrame = 0
    this.outFrameSets = new Map()

    // Ordering
    this.inOrderingQueue = new Map()
    this.inHighestIndex = new Array(32).fill(0)
    this.inOrderingIndex = new Array(32).fill(0)
    for (let i = 0; i < 32; i++) {
      this.inOrderingQueue.set(i, new Map())
    }
  }

  // Rename to tick?
  public update(): void {
    // Handle Ack
    if (this.receivedFrames.size > 0) {
      const ack = new Ack()
      const sequences = [...this.receivedFrames].map((x) => {
        this.receivedFrames.delete(x)

        return x
      })
      ack.sequences = sequences
      this.connection.sendPacket(ack)
    }
  }

  public handleBuffer(buffer: Buffer): void {
    const header = buffer[0] & 0xf0
    switch(header) {
      default: return console.log('Unknown BitFlag header:', header.toString(16))
      case Ack.id: return this.handleAck(buffer)
      case Bitflags.Nak: return console.log('NAK')
      case Bitflags.Valid: return this.handleValid(buffer)
    }
  }

  private handleValid(buffer: Buffer): void {
    const frameSet = new FrameSet(buffer).decode()

    // Checks for duplicate frame
    if (this.receivedFrames.has(frameSet.sequence)) {
      return console.log('Duplicate sequence:', frameSet.sequence)
    }

    // Deletes lost frame, if there was one
    this.lostFrames.delete(frameSet.sequence)

    // Checks if the frame is in order
    if (
      frameSet.sequence < this.lastFrame ||
      frameSet.sequence === this.lastFrame
    ) return console.log('Out of order sequence:', frameSet.sequence)

    // Adds the frame to the received frames
    this.receivedFrames.add(frameSet.sequence)

    const difference = frameSet.sequence - this.lastFrame

    // Checks if the frame is the next one
    if (difference !== 1) {
      // Adds the lost frames to the lost frames
      for (let i = 1; i < difference; i++) {
        this.lostFrames.add(this.lastFrame + i)
      }
    }

    // Updates the last frame
    this.lastFrame = frameSet.sequence

    // Handles the frames
    for (const frame of frameSet.frames) {
      this.handleFrame(frame)
    }
  }

  private handleFrame(frame: Frame): void {
    // TODO: Handle fragmented frames
    if (frame.isFragmented()) return console.log('TODO: Fragmented frame:', frame.length)
    // TODO: Handle sequenced frames
    if (frame.isSequenced()) return console.log('TODO: Sequenced frame:', frame.length)
    if (frame.isOrdered()) {
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

  public handlePacket(frame: Frame): void {
    const header = frame.body[0]

    switch(header) {
      default: return console.log(`Unknown packet header: 0x${header.toString(16)}`)
      case Ack.id: return this.handleAck(frame.body)
      // nack
      case ConnectionRequest.id: return this.handleConnectionRequest(frame.body)
      case ConnectedPing.id: return this.handleConnectedPing(frame.body)
      case NewIncomingConnection.id: return this.handleNewIncomingConnection()
      case Disconnect.id: return this.handleDisconnect()
      case GamePacket.id: return this.handleGamePacket(frame.body)
    }
  }

  public framePacket(packet: BasePacket): FrameSet | void {
    const frame = new Frame()
    frame.reliability = PacketReliability.Unreliable
    frame.orderingChannel = 0
    frame.body = packet.encode()

    if (frame.isSequenced()) return console.log('TODO: Sequenced frame:', frame)
    if (frame.isOrderExclusive()) return console.log('TODO: Ordered frame:', frame)

    frame.reliableIndex = this.outReliabilityIndex++

    const maxMtuSize = this.connection.mtuSize - 6 - 23
    // TODO: Handle fragmentation
    if (frame.body.byteLength > maxMtuSize) return console.log('too big')

    //TODO store in queue
    const frameSet = new FrameSet()
    frameSet.sequence = this.outFrame++
    frameSet.frames = [frame]

    // Add the frameSet to the outFrameSets for Ack to handle
    this.outFrameSets.set(frameSet.sequence, { frameSet, ping: BigInt(Date.now()) })

    return frameSet
  }

  private handleAck(buffer: Buffer): void {
    const ack = new Ack(buffer).decode()
    for (const sequence of ack.sequences) {
      const entry = this.outFrameSets.get(sequence)
      if (!entry) return console.log('Unknown sequence:', sequence)
      this.outFrameSets.delete(sequence)
      // TODO: possible to make better?
      if (entry.ping) {
        const pingTime = Number(entry.ping)
        const current = Number(BigInt(Date.now()))
        this.connection.ping = current - pingTime
      }
    }
  }

  private handleConnectionRequest(buffer: Buffer): void {
    const request = new ConnectionRequest(buffer).decode()
    const accepted = new ConnectionRequestAccepted()
    // Fix this
    accepted.clientAddress = { address: this.connection.getAddress(), port: this.connection.getPort(), version: 4 }
    accepted.requestTime = request.time
    accepted.time = BigInt(Date.now())

    return this.connection.sendPacket(accepted)
  }

  private handleConnectedPing(buffer: Buffer): void {
    const ping = new ConnectedPing(buffer).decode()
    const pong = new ConnectedPong()
    pong.pingTime = ping.time
    pong.pongTime = BigInt(Date.now())

    return this.connection.sendPacket(pong)
  }

  private handleNewIncomingConnection(): void {
    this.raknet.emit(RaknetEvent.ConnectionOpened, this.connection)
  }

  private handleDisconnect(): void {
    // Send Ack
    this.update()
    this.raknet.emit(RaknetEvent.ConnectionClosed, this.connection)
    this.raknet.connections.delete(this.connection.guid)
  }

  private handleGamePacket(buffer: Buffer): void {
    const packet = new GamePacket(buffer).decode()
    this.raknet.emit(RaknetEvent.GamePacket, packet, this.connection)
  }
}

export {
  OnlineHandler,
}
