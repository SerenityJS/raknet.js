import { Frame } from './Frame'

import { Packet, Serialize, DataPacket } from '../DataPacket'
import { UInt24, Endianness } from 'binarystream.js'
import { Frames } from '../types'

@Packet(0x80)
class FrameSet extends DataPacket {
  @Serialize(UInt24, Endianness.Little) public sequence!: number
  @Serialize(Frames) public frames!: Frame[]

  public getByteLength(): number {
    let length = 4
    for (const frame of this.frames.values()) {
      length += frame.getByteLength()
    }

    return length
  }
}

export {
  FrameSet,
}
