import { BinaryStream, Type, Endianness, UInt8 } from 'binarystream.js'

abstract class DataPacket extends BinaryStream {
  public static id: number
  
  public constructor(buffer?: Buffer) {
    super(buffer)
  }

  public getId(): number {
    throw new Error('Packet.getId() is not implemented.')
  }

  public serialize(): Buffer {
    throw new Error('Packet.serialize() is not implemented.')
  }

  public deserialize(): this {
    throw new Error('Packet.deserialize() is not implemented.')
  }
}

function Packet(id: number, type: typeof Type = UInt8) {
  return function(target: typeof DataPacket) {
    target.id = id
    const metadata = Reflect.getOwnMetadata('properties', target.prototype) as { name: string, type: typeof Type, endian: Endianness }[]
    const properties = Object.getOwnPropertyNames(target.prototype)

    if (!properties.includes('serialize'))
      target.prototype.serialize = function() {
        type.write(this, target.id)
        if (!metadata) return this.getBuffer()
        for (const { name, type, endian } of metadata) {
          type.write(this, (this as any)[name], endian)
        }

        return this.getBuffer()
      }
    if (!properties.includes('deserialize'))
      target.prototype.deserialize = function() {
        type.read(this)
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
  DataPacket,
  Packet,
  Serialize,
}