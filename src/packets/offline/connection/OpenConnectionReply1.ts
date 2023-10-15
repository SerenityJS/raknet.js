import { Packet, Serialize } from '../../BasePacket'
import { OfflinePacket } from '../OfflinePacket'
import { Magic } from '../../types'
import { Short, Long, Bool } from 'binarystream.js'

@Packet(0x06)
class OpenConnectionReply1 extends OfflinePacket {
  @Serialize(Magic) public magic!: Buffer
  @Serialize(Long) public serverGuid!: bigint
  @Serialize(Bool) public security!: boolean
  @Serialize(Short) public mtuSize!: number
}

export {
  OpenConnectionReply1,
}