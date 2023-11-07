import { Long } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x09)
class ConnectionRequest extends DataPacket {
	@Serialize(Long) public clientGuid!: bigint;
	@Serialize(Long) public timestamp!: bigint;
}

export { ConnectionRequest };
