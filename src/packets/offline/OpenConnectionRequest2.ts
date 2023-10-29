import { Buffer } from 'node:buffer';
import { Long, Short } from 'binarystream.js';
import { Magic, Address, ServerAddress } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x07)
class OpenConnectionRequest2 extends DataPacket {
	@Serialize(Magic) public magic!: Buffer;
	@Serialize(Address) public serverAddress!: ServerAddress;
	@Serialize(Short) public mtu!: number;
	@Serialize(Long) public clientGuid!: bigint;
}

export { OpenConnectionRequest2 };
