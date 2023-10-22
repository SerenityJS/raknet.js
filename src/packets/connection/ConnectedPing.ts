import { Packet, DataPacket, Serialize } from '../DataPacket'
import { Long } from 'binarystream.js'

@Packet(0x00)
class ConnectedPing extends DataPacket {
  @Serialize(Long) public time!: bigint
}

export {
    ConnectedPing,
  }