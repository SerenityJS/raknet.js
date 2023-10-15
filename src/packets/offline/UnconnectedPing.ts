import { Packet, Serialize } from '../BasePacket'
import { OfflinePacket } from './OfflinePacket'
import { Magic } from '../types'
import { Long } from 'binarystream.js'

@Packet(0x01)
class UnconnectedPing extends OfflinePacket {
  @Serialize(Long) public time!: bigint
  @Serialize(Magic) public magic!: Buffer
  @Serialize(Long) public guid!: bigint
}

export {
  UnconnectedPing,
}
