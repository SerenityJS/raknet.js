import { DataType, BinaryStream } from 'binarystream.js'

class Mtu extends DataType {
  public static read(stream: BinaryStream): number {
    return stream.getBuffer().byteLength
  }
  public static write(stream: BinaryStream, value: number): void {
    stream.write(Buffer.alloc(value - stream.getBuffer().byteLength))
  }
}

export {
  Mtu,
}
