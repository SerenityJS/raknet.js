import { BinaryStream, Type, Endianness } from 'binarystream.js'

abstract class BasePacket extends BinaryStream {
  public static id: number

  public constructor(buffer?: Buffer) {
    super(buffer)
  }

  public encode(): Buffer {
    throw new Error('Not implemented')
  }

  public decode(): this {
    throw new Error('Not implemented')
  }

  public getId(): number {
    throw new Error('Not implemented')
  }
}

function Packet(id: number) {
  return function(target: typeof BasePacket) {
    target.id = id
    const metadata = Reflect.getOwnMetadata('properties', target.prototype) as { name: string, type: typeof Type, endian: Endianness }[]

    const properties = Object.getOwnPropertyNames(target.prototype)
    if (!properties.includes('encode'))
      target.prototype.encode = function() {
        this.writeUInt8(id)

        if (!metadata) return this.getBuffer()
        for (const { name, type, endian } of metadata) {
          type.write(this, (this as any)[name], endian)
        }

        return this.getBuffer()
      }
    if (!properties.includes('decode'))
      target.prototype.decode = function() {
        this.readUInt8()

        if (!metadata) return this
        for (const { name, type, endian } of metadata) {
          (this as any)[name] = type.read(this, endian)
        }

        return this
      }
    if (!properties.includes('getId'))
      target.prototype.getId = function() {
        return target.id
      }
  }
}

function Serialize(type: typeof Type | typeof String, endian: Endianness = Endianness.Big) {
  if (!type) throw new Error('Type is required')

  return function(target: any, name: string) {
    const properties = Reflect.getOwnMetadata('properties', target) || []
    properties.push({ name, type, endian })
    Reflect.defineMetadata('properties', properties, target)
  }
}

export {
  BasePacket,
  Packet,
  Serialize,
}
