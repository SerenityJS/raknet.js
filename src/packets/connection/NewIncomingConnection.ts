import { Packet, DataPacket, Serialize } from '../DataPacket'
import { Address } from '../types'

@Packet(0x13)
class NewIncomingConnection extends DataPacket {
  @Serialize(Address) public serverAddress!: bigint
  @Serialize(Address) public internalAddress!: bigint
}

export {
  NewIncomingConnection,
}