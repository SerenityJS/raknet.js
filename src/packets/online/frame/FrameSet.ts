import type { Frame } from './Frame'

import { Packet, Serialize } from '../../BasePacket'
import { OnlinePacket } from '../OnlinePacket'
import { Frames } from '../../types'
import { UInt24, Endianness } from 'binarystream.js'

@Packet(0x80)
class FrameSet extends OnlinePacket {
  @Serialize(UInt24, Endianness.Little) public sequence!: number
  @Serialize(Frames) public frames!: Frame[]
}

export {
  FrameSet,
}