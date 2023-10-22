import { Packet, DataPacket, Serialize } from '../DataPacket'
import { Long } from 'binarystream.js'

@Packet(0x09)
class ConnectionRequest extends DataPacket {
  @Serialize(Long) public clientGuid!: bigint
  @Serialize(Long) public time!: bigint
}

export {
  ConnectionRequest,
}