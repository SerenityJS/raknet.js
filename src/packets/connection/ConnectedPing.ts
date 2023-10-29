import { Long } from 'binarystream.js';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x00)
class ConnectedPing extends DataPacket {
	@Serialize(Long) public timestamp!: bigint;
}

export { ConnectedPing };
