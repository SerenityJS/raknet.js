import { ServerAddress, Address } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';

@Packet(0x13)
class NewIncomingConnection extends DataPacket {
	@Serialize(Address) public serverAddress!: ServerAddress;
	@Serialize(Address) public internalAddress!: ServerAddress;
}

export { NewIncomingConnection };
