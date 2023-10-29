import { Buffer } from 'node:buffer';
import { UInt8, Long } from 'binarystream.js';
import { Magic } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x19)
class IncompatibleProtocol extends DataPacket {
	@Serialize(UInt8) public protocol!: number;
	@Serialize(Magic) public magic!: Buffer;
	@Serialize(Long) public serverGuid!: bigint;
}

export { IncompatibleProtocol };
