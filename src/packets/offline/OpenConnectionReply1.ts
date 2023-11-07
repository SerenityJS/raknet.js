import { Buffer } from 'node:buffer';
import { Long, Bool, Short, Magic } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x06)
class OpenConnectionReply1 extends DataPacket {
	@Serialize(Magic) public magic!: Buffer;
	@Serialize(Long) public serverGuid!: bigint;
	@Serialize(Bool) public useSecurity!: boolean;
	@Serialize(Short) public mtu!: number;
}

export { OpenConnectionReply1 };
