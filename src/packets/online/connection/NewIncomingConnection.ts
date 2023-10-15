import { Packet, Serialize } from '../../BasePacket'
import { OnlinePacket } from '../OnlinePacket'
import { Address } from '../../types'

@Packet(0x13)
class NewIncomingConnection extends OnlinePacket {
  @Serialize(Address) public serverAddress!: bigint
  @Serialize(Address) public internalAddress!: bigint
}

export {
  NewIncomingConnection,
}