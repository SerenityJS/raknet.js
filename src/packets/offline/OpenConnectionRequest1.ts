import { Buffer } from 'node:buffer';
import { UInt8, Magic, MTU } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x05)
class OpenConnectionRequest1 extends DataPacket {
	@Serialize(Magic) public magic!: Buffer;
	@Serialize(UInt8) public protocol!: number;
	@Serialize(MTU) public mtu!: number;
}

export { OpenConnectionRequest1 };
