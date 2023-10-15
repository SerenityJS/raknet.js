import { Packet, Serialize } from '../../BasePacket'
import { OnlinePacket } from '../OnlinePacket'
import { Long } from 'binarystream.js'

@Packet(0x09)
class ConnectionRequest extends OnlinePacket {
  @Serialize(Long) public clientGuid!: bigint
  @Serialize(Long) public time!: bigint
}

export {
  ConnectionRequest,
}