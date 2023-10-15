import { Type, BinaryStream } from 'binarystream.js'

const MagicBytes = '\u0000\u00FF\u00FF\u0000\u00FE\u00FE\u00FE\u00FE\u00FD\u00FD\u00FD\u00FD\u0012\u0034\u0056\u0078'

class Magic extends Type {
  public static read(stream: BinaryStream): Buffer {
    return stream.read(16)
  }
  public static write(stream: BinaryStream): void {
    stream.write(Buffer.from(MagicBytes, 'binary'))
  }
}

export {
  Magic,
}
