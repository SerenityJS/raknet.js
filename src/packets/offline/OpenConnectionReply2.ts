import { Buffer } from 'node:buffer';
import { Long, Bool, Short } from 'binarystream.js';
import { Magic, Address } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x08)
class OpenConnectionReply2 extends DataPacket {
	@Serialize(Magic) public magic!: Buffer;
	@Serialize(Long) public serverGuid!: bigint;
	@Serialize(Address) public clientAddress!: Address;
	@Serialize(Short) public mtu!: number;
	@Serialize(Bool) public useEncryption!: boolean;
}

export { OpenConnectionReply2 };
