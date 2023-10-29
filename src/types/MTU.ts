import { Buffer } from 'node:buffer';
import type { BinaryStream } from 'binarystream.js';
import { DataType } from 'binarystream.js';

class MTU extends DataType {
	public static override read(stream: BinaryStream): number {
		return stream.getBuffer().length;
	}

	public static override write(stream: BinaryStream, value: number): void {
		stream.write(Buffer.alloc(value - stream.getBuffer().length));
	}
}

export { MTU };
