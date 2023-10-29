import { Buffer } from 'node:buffer';
import type { BinaryStream } from 'binarystream.js';
import { DataType } from 'binarystream.js';
import type { ServerAddress } from './Address';
import { Address } from './Address';

class SystemAddress extends DataType {
	public static override read(stream: BinaryStream): ServerAddress[] {
		const addresses: ServerAddress[] = [];
		for (let i = 0; i < 20; i++) {
			const address = Address.read(stream);
			addresses.push(address);
		}

		return addresses;
	}

	public static override write(stream: BinaryStream): void {
		const addresses: ServerAddress[] = [{ address: '127.0.0.1', port: 0, version: 4 }];
		for (let i = 0; i < 20; i++) {
			Address.write(stream, addresses[i] || { address: '0.0.0.0', port: 0, version: 4 });
		}
	}
}

export { SystemAddress };