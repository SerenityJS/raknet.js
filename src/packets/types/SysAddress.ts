import { Type, BinaryStream } from 'binarystream.js'
import { Address } from './Address'

class SysAddress extends Type {
  public static read(stream: BinaryStream): { address: string, port: number, version: number }[] {
    const addresses: { address: string, port: number, version: number }[] = []
    for (let i = 0; i < 20; i++) {
      const address = Address.read(stream)
      addresses.push(address)
    }

    return addresses
  }
  public static write(stream: BinaryStream): void {
    const address: { address: string, port: number, version: number }[] = [{ address: '127.0.0.1', port: 0, version: 4 }]
    for (let i = 0; i < 20; i++) {
      Address.write(stream, address[i] || { address: '0.0.0.0', port: 0, version: 4 })
    }
  }
}

export {
  SysAddress,
}
