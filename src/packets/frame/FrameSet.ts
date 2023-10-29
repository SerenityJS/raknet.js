import { UInt24, Endianness } from 'binarystream.js';
import { Frames } from '../../types';
import { DataPacket, Packet, Serialize } from '../DataPacket';
import type { Frame } from './Frame';

@Packet(0x80)
class FrameSet extends DataPacket {
	@Serialize(UInt24, Endianness.Little) public sequence!: number;
	@Serialize(Frames) public frames!: Frame[];
}

export { FrameSet };
