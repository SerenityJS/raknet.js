import { Long } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x03)
class ConnectedPong extends DataPacket {
	@Serialize(Long) public pingTimestamp!: bigint;
	@Serialize(Long) public timestamp!: bigint;
}

export { ConnectedPong };
