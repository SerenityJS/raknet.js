import { DataType, BinaryStream } from 'binarystream.js'

class Binary extends DataType {
  public static read(stream: BinaryStream): Buffer {
    return stream.getBuffer()
  }
  public static write(stream: BinaryStream, value: Buffer): void {
    stream.write(value)
  }
}

export {
  Binary,
}
