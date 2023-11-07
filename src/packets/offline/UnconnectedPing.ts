import { Buffer } from 'node:buffer';
import { Long, Magic } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x01)
class UnconnectedPing extends DataPacket {
	@Serialize(Long) public timestamp!: bigint;
	@Serialize(Magic) public magic!: Buffer;
	@Serialize(Long) public clientGuid!: bigint;
}

export { UnconnectedPing };
