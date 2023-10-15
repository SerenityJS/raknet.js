import { Packet } from '../BasePacket'
import { AcknowledgePacket } from './AcknowledgePacket'
import { BinaryStream } from 'binarystream.js'

@Packet(0xc0)
class Ack extends AcknowledgePacket {
  public sequences: number[] = []

  // Override encode due to custom logic, maybe move into own type?
  public override encode(): Buffer {
    this.writeUInt8(Ack.id)
    const stream = new BinaryStream()
    this.sequences.sort((a, b) => a - b)
    const count = this.sequences.length
    let records = 0

    if (count > 0) {
      let cursor = 0
      let start = this.sequences[0]
      let last = this.sequences[0]

      while (cursor < count) {
        const current = this.sequences[cursor++]
        const diff = current - last
        if (diff === 1) {
          last = current
        } else if (diff > 1) {
          if (start === last) {
            stream.writeBool(true) // single?
            stream.writeUInt24LE(start)
            start = last = current
          } else {
            stream.writeBool(false) // single?
            stream.writeUInt24LE(start)
            stream.writeUInt24LE(last)
            start = last = current
          }
          ++records
        }
      }

      // last iteration
      if (start === last) {
        stream.writeBool(true) // single?
        stream.writeUInt24LE(start)
      } else {
        stream.writeBool(false) // single?
        stream.writeUInt24LE(start)
        stream.writeUInt24LE(last)
      }
      ++records

      this.writeUShort(records)
      this.write(stream.getBuffer())
    }

    return this.getBuffer()
  }

  // Override decode due to custom logic, maybe move into own type?
  public override decode(): this {
    this.readUInt8()
    this.sequences = []
    const recordCount = this.readUShort()
    for (let i = 0; i < recordCount; i++) {
      const range = this.readBool() // False for range, True for no range
      if (range) {
        this.sequences.push(this.readUInt24LE())
      } else {
        const start = this.readUInt24LE()
        const end = this.readUInt24LE()
        for (let i = start; i <= end; i++) {
          this.sequences.push(i)
        }
      }
    }

    return this
  }
}

export {
  Ack,
}