import { Packet, Serialize, DataPacket } from '../../DataPacket'
import { Magic, Address } from '../../types'
import { Long, Short } from 'binarystream.js'

@Packet(0x07)
class OpenConnectionRequest2 extends DataPacket {
  @Serialize(Magic) public magic!: Buffer
  @Serialize(Address) public serverAddress!: { address: string, port: number, version: number }
  @Serialize(Short) public mtuSize!: number
  @Serialize(Long) public clientGuid!: bigint
}

export {
  OpenConnectionRequest2,
}