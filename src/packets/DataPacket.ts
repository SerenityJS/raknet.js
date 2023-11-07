import type { Buffer } from 'node:buffer';
import { BinaryStream, Endianness } from '@serenityjs/binarystream';
import { UInt8 } from '../types';
import type { DataType } from '../types';

interface PacketMetadata {
	endian: Endianness;
	name: string;
	testField?: string;
	type: typeof DataType;
}

abstract class DataPacket extends BinaryStream {
	public static id: number;

	public constructor(buffer?: Buffer) {
		super(buffer);
	}

	public getId(): number {
		throw new Error('Packet.getId() is not implemented.');
	}

	public serialize(): Buffer {
		throw new Error('Packet.serialize() is not implemented.');
	}

	public deserialize(): this {
		throw new Error('Packet.deserialize() is not implemented.');
	}
}

function Packet(id: number, type: typeof DataType = UInt8) {
	return function (target: typeof DataPacket) {
		target.id = id;
		const metadata: PacketMetadata[] = Reflect.getOwnMetadata('properties', target.prototype);
		const properties = Object.getOwnPropertyNames(target.prototype);
		if (!properties.includes('serialize'))
			target.prototype.serialize = function () {
				type.write(this, target.id);
				if (!metadata) return this.getBuffer();
				for (const { name, type, endian, testField } of metadata) {
					if (testField) {
						const value = (this as any)[testField!];
						type.write(this, (this as any)[name], endian, value);
					} else {
						type.write(this, (this as any)[name], endian);
					}
				}

				return this.getBuffer();
			};

		if (!properties.includes('deserialize'))
			target.prototype.deserialize = function () {
				type.read(this);
				if (!metadata) return this;
				for (const { name, type, endian, testField } of metadata) {
					if (testField) {
						const value = (this as any)[testField!];
						(this as any)[name] = type.read(this, endian, value);
					} else {
						(this as any)[name] = type.read(this, endian);
					}
				}

				return this;
			};

		if (!properties.includes('getId'))
			target.prototype.getId = function () {
				return target.id;
			};
	};
}

function Serialize(type: typeof DataType, endian: Endianness = Endianness.Big, testField?: string) {
	if (!type) throw new Error('Type is required');

	return function (target: any, name: string) {
		const properties = Reflect.getOwnMetadata('properties', target) || [];
		properties.push({ name, type, endian, testField });
		Reflect.defineMetadata('properties', properties, target);
	};
}

export { DataPacket, Packet, Serialize };
