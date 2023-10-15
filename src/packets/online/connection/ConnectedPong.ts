import { Packet, Serialize } from '../../BasePacket'
import { OnlinePacket } from '../OnlinePacket'
import { Long } from 'binary-stream'

@Packet(0x03)
class ConnectedPong extends OnlinePacket {
  @Serialize(Long) public pingTime!: bigint
  @Serialize(Long) public pongTime!: bigint
}

export {
  ConnectedPong,
}