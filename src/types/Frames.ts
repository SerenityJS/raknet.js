import type { BinaryStream } from 'binarystream.js';
import { DataType } from 'binarystream.js';
import { Frame } from '../packets';

class Frames extends DataType {
	public static override read(stream: BinaryStream): Frame[] {
		const frames: Frame[] = [];
		do {
			const frame = new Frame(stream).deserialize();
			frames.push(frame);
		} while (!stream.cursorAtEnd());

		return frames;
	}

	public static override write(stream: BinaryStream, value: Frame[]): void {
		for (const frame of value) {
			stream.write(frame.serialize());
		}
	}
}

export { Frames };
