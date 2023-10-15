import { Packet, Serialize } from '../BasePacket'
import { OfflinePacket } from './OfflinePacket'
import { Magic } from '../types'
import { Long, LitString } from 'binary-stream'

@Packet(0x1c)
class UnconnectedPong extends OfflinePacket {
  @Serialize(Long) public time!: bigint
  @Serialize(Long) public serverGuid!: bigint
  @Serialize(Magic) public magic!: Buffer
  @Serialize(LitString) public motd!: string
}

export {
  UnconnectedPong,
}
