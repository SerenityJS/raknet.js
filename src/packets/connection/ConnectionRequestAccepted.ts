import { Long, Short } from 'binarystream.js';
import { ServerAddress, Address, SystemAddress } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x10)
class ConnectionRequestAccepted extends DataPacket {
	@Serialize(Address) public clientAddress!: ServerAddress;
	@Serialize(Short) public systemIndex!: number;
	@Serialize(SystemAddress) public systemAddresses!: ServerAddress[];
	@Serialize(Long) public requestTimestamp!: bigint;
	@Serialize(Long) public timestamp!: bigint;
}

export { ConnectionRequestAccepted };
