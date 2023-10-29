import { Buffer } from 'node:buffer';
import type { BinaryStream } from 'binarystream.js';
import { DataType } from 'binarystream.js';
import { MagicBytes } from '../constants';

const MagicBuffer = Buffer.from(MagicBytes, 'binary');

class Magic extends DataType {
	public static override read(stream: BinaryStream): Buffer {
		return stream.read(MagicBuffer.length);
	}

	public static override write(stream: BinaryStream): void {
		stream.write(MagicBuffer);
	}
}

export { Magic };
