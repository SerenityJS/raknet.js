import { Packet, DataPacket } from '../DataPacket'

@Packet(0x15)
class Disconnect extends DataPacket {}

export {
  Disconnect,
}