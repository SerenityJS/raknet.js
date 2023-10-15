import { Packet, Serialize} from '../../BasePacket'
import { UInt8 } from 'binary-stream'
import { Binary } from '../../types'
import { OnlinePacket } from '../OnlinePacket'

@Packet(0xfe)
class GamePacket extends OnlinePacket {
  @Serialize(UInt8) public size!: number
  @Serialize(Binary) public body!: Buffer
}

export {
  GamePacket,
}
