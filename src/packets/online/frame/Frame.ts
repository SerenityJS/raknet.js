import { BinaryStream, Endianness } from 'binarystream.js'
import { PacketReliability } from '../../../constants'

class Frame {
  public readonly stream: BinaryStream
  public header!: number
  public reliability!: number
  public split!: number
  public length!: number
  public reliableIndex!: number
  public sequenceIndex!: number
  public orderingIndex!: number
  public orderingChannel!: number
  public fragmentSize!: number
  public fragmentId!: number
  public fragmentIndex!: number
  public body!: Buffer

  public constructor(stream?: BinaryStream) {
    this.stream = stream ?? new BinaryStream()
  }

  public encode(): BinaryStream {
    const stream = new BinaryStream()
    stream.writeUInt8((this.reliability << 5) | (this.isFragmented() ? 0x10 : 0))
    stream.writeUShort(this.body.length << 3)
    if (this.isReliable()) stream.writeUInt24(this.reliableIndex, Endianness.Little)
    if (this.isSequenced()) stream.writeUInt24(this.sequenceIndex, Endianness.Little)
    if (this.isOrdered()) {
      stream.writeUInt24(this.orderingIndex, Endianness.Little)
      stream.writeUInt8(this.orderingChannel)
    }
    if (this.isFragmented()) {
      stream.writeInt32(this.fragmentSize)
      stream.writeUShort(this.fragmentId)
      stream.writeInt32(this.fragmentIndex)
    }
    stream.write(this.body)

    return stream
  }

  public decode(): this {
    this.header = this.stream.readUInt8()
    this.reliability = (this.header & 0xe0) >> 5
    this.split = (this.header & 0x10)
    this.length = Math.ceil(this.stream.readUShort() / 8)
    if (this.isReliable()) this.reliableIndex = this.stream.readUInt24(Endianness.Little)
    if (this.isSequenced()) this.sequenceIndex = this.stream.readUInt24(Endianness.Little)
    if (this.isOrdered()) {
      this.orderingIndex = this.stream.readUInt24(Endianness.Little)
      this.orderingChannel = this.stream.readUInt8()
    }
    if (this.split > 0) {
      this.fragmentSize = this.stream.readInt32()
      this.fragmentId = this.stream.readUShort()
      this.fragmentIndex = this.stream.readInt32()
    }
    this.body = this.stream.read(this.length)

    return this
  }

  public isFragmented(): boolean {
    return this.fragmentSize > 0
  }

  public isReliable(): boolean {
    const values = [
      PacketReliability.Reliable,
      PacketReliability.ReliableOrdered,
      PacketReliability.ReliableSequenced,
      PacketReliability.ReliableWithAckReceipt,
      PacketReliability.ReliableOrderedWithAckReceipt,
    ]

    return values.find(value => value === this.reliability) !== undefined
  }

  public isSequenced(): boolean {
    const values = [
      PacketReliability.ReliableSequenced,
      PacketReliability.UnreliableSequenced
    ]

    return values.find(value => value === this.reliability) !== undefined
  }

  public isOrdered(): boolean {
    const values = [
      PacketReliability.UnreliableSequenced,
      PacketReliability.ReliableOrdered,
      PacketReliability.ReliableSequenced,
      PacketReliability.ReliableOrderedWithAckReceipt,
    ]

    return values.find(value => value === this.reliability) !== undefined
  }

  public isOrderExclusive(): boolean {
    const values = [
      PacketReliability.ReliableOrdered,
      PacketReliability.ReliableOrderedWithAckReceipt
    ]

    return values.find(value => value === this.reliability) !== undefined
  }
}

export {
  Frame,
}