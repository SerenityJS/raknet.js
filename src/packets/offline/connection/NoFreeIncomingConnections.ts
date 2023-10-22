import { Packet, Serialize, DataPacket } from '../../DataPacket'
import { Magic } from '../../types'
import { Long } from 'binarystream.js'

@Packet(0x14)
class NoFreeIncomingConnections extends DataPacket {
  @Serialize(Magic) public magic!: Buffer
  @Serialize(Long) public serverGuid!: bigint
}

export {
  NoFreeIncomingConnections,
}