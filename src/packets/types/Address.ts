import { Type, BinaryStream } from 'binary-stream'

class Address extends Type {
  public static read(stream: BinaryStream): { address: string, port: number, version: number } {
    const version = stream.readByte()
    if (version === 4) {
      let ipBytes = stream.read(4)
      let address = `${(-ipBytes[0]-1)&0xff}.${(-ipBytes[1]-1)&0xff}.${(-ipBytes[2]-1)&0xff}.${(-ipBytes[3]-1)&0xff}`
      let port = stream.readUShort()

      return { address, port, version }
    } else {
      let ipBytes = stream.read(16)
      let address = `${(-ipBytes[0]-1)&0xff}.${(-ipBytes[1]-1)&0xff}.${(-ipBytes[2]-1)&0xff}.${(-ipBytes[3]-1)&0xff}`
      let port = stream.readUShort()

      return { address, port, version }
    }
  }
  public static write(stream: BinaryStream, value: { address: string, port: number, version: number }): void {
    stream.writeByte(value.version)
    value.address.split('.', 4).forEach((val) => stream.writeByte(-val-1))
    stream.writeUShort(value.port)
  }
}

export {
  Address,
}
