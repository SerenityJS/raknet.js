import type { Frame } from './Frame'

import { Packet, Serialize } from '../../BasePacket'
import { OnlinePacket } from '../OnlinePacket'
import { Frames } from '../../types'
import { UInt24LE } from 'binarystream.js'

@Packet(0x80)
class FrameSet extends OnlinePacket {
  @Serialize(UInt24LE) public sequence!: number
  @Serialize(Frames) public frames!: Frame[]
}

export {
  FrameSet,
}