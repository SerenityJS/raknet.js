import { Packet, Serialize } from '../../BasePacket'
import { OfflinePacket } from '../OfflinePacket'
import { Magic, Address } from '../../types'
import { Long, Short } from 'binary-stream'

@Packet(0x07)
class OpenConnectionRequest2 extends OfflinePacket {
  @Serialize(Magic) public magic!: Buffer
  @Serialize(Address) public serverAddress!: { address: string, port: number, version: number }
  @Serialize(Short) public mtuSize!: number
  @Serialize(Long) public clientGuid!: bigint
}

export {
  OpenConnectionRequest2,
}