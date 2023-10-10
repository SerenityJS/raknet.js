import BinaryStream from "binary-stream"
import { Magic } from '../constants'

class Packet extends BinaryStream {
  public readonly id: number

  public constructor(id: number, buffer?: Buffer) {
    super(buffer)
    this.id = id
  }

  public serialize(): Buffer {
    this.writeUInt8(this.id)
    return this.encode()
  }

  protected encode(): Buffer { return this.getBuffer() }

  public deserialize(): Packet {
    this.readUInt8()
    return this.decode()
  }

  protected decode(): Packet { return this }

  public readMagic(): Buffer {
    return this.read(16)
  }

  public writeMagic(): void {
    this.write(Buffer.from(Magic, 'binary'))
  }
}

export {
  Packet,
}
