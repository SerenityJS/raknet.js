import { Packet } from '../../BasePacket'
import { OnlinePacket } from '../OnlinePacket'

@Packet(0x15)
class Disconnect extends OnlinePacket {}

export {
  Disconnect,
}
