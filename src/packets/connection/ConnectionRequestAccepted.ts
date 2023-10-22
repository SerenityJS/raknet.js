import { Packet, DataPacket, Serialize } from '../DataPacket'
import { Long, Short } from 'binarystream.js'
import { Address, SysAddress } from '../types'

@Packet(0x10)
class ConnectionRequestAccepted extends DataPacket {
  @Serialize(Address) public clientAddress!: { address: string, port: number, version: number }
  @Serialize(Short) public systemIndex!: number
  @Serialize(SysAddress) public systemAddresses!: { address: string, port: number, version: number }[]
  @Serialize(Long) public requestTime!: bigint
  @Serialize(Long) public time!: bigint
}

export {
  ConnectionRequestAccepted,
}