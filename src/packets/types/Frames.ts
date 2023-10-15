import { Type, BinaryStream } from 'binary-stream'
import { Frame } from '../online/frame/Frame'

class Frames extends Type {
  public static read(stream: BinaryStream): Frame[] {
    const frames: Frame[] = []
    do {
      const frame = new Frame(stream).decode()
      frames.push(frame)
    } while (!stream.cursorAtEnd())
    
    return frames
  }
  public static write(stream: BinaryStream, frames: Frame[]): void {
    for (const frame of frames) {
      stream.write(frame.encode().getBuffer())
    }
  }
}

export {
  Frames,
}
