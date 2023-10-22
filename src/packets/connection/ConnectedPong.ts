import { Packet, DataPacket, Serialize } from '../DataPacket'
import { Long } from 'binarystream.js'

@Packet(0x03)
class ConnectedPong extends DataPacket {
  @Serialize(Long) public pingTime!: bigint
  @Serialize(Long) public pongTime!: bigint
}

export {
  ConnectedPong,
}