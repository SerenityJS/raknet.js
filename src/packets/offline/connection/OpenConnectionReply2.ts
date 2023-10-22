import { Packet, Serialize, DataPacket } from '../../DataPacket'
import { Address, Magic } from '../../types'
import { Short, Long, Bool } from 'binarystream.js'

@Packet(0x08)
class OpenConnectionReply2 extends DataPacket {
  @Serialize(Magic) public magic!: Buffer
  @Serialize(Long) public serverGuid!: bigint
  @Serialize(Address) public clientAddress!: { address: string, port: number, version: number }
  @Serialize(Short) public mtuSize!: number
  @Serialize(Bool) public encryption!: boolean
}

export {
  OpenConnectionReply2,
}