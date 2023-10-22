import { Packet, DataPacket, Serialize } from '../DataPacket'
import { Long } from 'binarystream.js'
import { Magic } from '../types'

@Packet(0x01)
class UnconnectedPing extends DataPacket {
  @Serialize(Long) public time!: bigint
  @Serialize(Magic) public magic!: Buffer
  @Serialize(Long) public clientGuid!: bigint
}

export {
  UnconnectedPing,
}
