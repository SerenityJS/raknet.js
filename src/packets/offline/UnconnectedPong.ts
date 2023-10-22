import { Packet, DataPacket, Serialize } from '../DataPacket'
import { Long, LitString } from 'binarystream.js'
import { Magic } from '../types'

@Packet(0x1c)
class UnconnectedPong extends DataPacket {
  @Serialize(Long) public time!: bigint
  @Serialize(Long) public serverGuid!: bigint
  @Serialize(Magic) public magic!: Buffer
  @Serialize(LitString) public motd!: string
}

export {
  UnconnectedPong,
}
