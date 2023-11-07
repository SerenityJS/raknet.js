import { Buffer } from 'node:buffer';
import { Long, LitString, Magic } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x1c)
class UnconnectedPong extends DataPacket {
	@Serialize(Long) public timestamp!: bigint;
	@Serialize(Long) public serverGuid!: bigint;
	@Serialize(Magic) public magic!: Buffer;
	@Serialize(LitString) public motd!: string;
}

export { UnconnectedPong };
