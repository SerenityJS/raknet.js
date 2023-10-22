import { Packet, Serialize, DataPacket } from '../../DataPacket'
import { Magic, Mtu } from '../../types'
import { UInt8 } from 'binarystream.js'

@Packet(0x05)
class OpenConnectionRequest1 extends DataPacket {
  @Serialize(Magic) public magic!: Buffer
  @Serialize(UInt8) public protocol!: number
  @Serialize(Mtu) public mtuSize!: number
}

export {
  OpenConnectionRequest1,
}