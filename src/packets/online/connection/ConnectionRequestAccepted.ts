import { Packet, Serialize } from '../../BasePacket'
import { OnlinePacket } from '../OnlinePacket'
import { Address, SysAddress } from '../../types'
import { Long, Short } from 'binarystream.js'

@Packet(0x10)
class ConnectionRequestAccepted extends OnlinePacket {
  @Serialize(Address) public clientAddress!: { address: string, port: number, version: number }
  @Serialize(Short) public systemIndex!: number
  @Serialize(SysAddress) public systemAddresses!: { address: string, port: number, version: number }[]
  @Serialize(Long) public requestTime!: bigint
  @Serialize(Long) public time!: bigint
}

export {
  ConnectionRequestAccepted,
}