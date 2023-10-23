import { DataType, BinaryStream } from 'binarystream.js'
import { Frame } from '../frames/Frame'

class Frames extends DataType {
  public static read(stream: BinaryStream): Frame[] {
    const frames: Frame[] = []
    do {
      const frame = new Frame(stream).deserialize()
      frames.push(frame)
    } while (!stream.cursorAtEnd())
    
    return frames
  }
  public static write(stream: BinaryStream, frames: Frame[]): void {
    for (const frame of frames.values()) {
      stream.write(frame.serialize())
    }
  }
}

export {
  Frames,
}
