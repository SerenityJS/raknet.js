import { Socket, createSocket, RemoteInfo } from 'node:dgram'
import { Bitflags } from './constants'
import BinaryStream from 'binary-stream'

class Raknet {
  public readonly socket: Socket
  public readonly connections: Map<RemoteInfo, any>

  public constructor() {
    this.socket = createSocket('udp4')
  }

  public listen(address: string, port: number) {
    try {
      this.socket.bind(port, address)
        .on('listening', this.handleListening.bind(this))
        .on('error', this.handleError.bind(this))
        .on('close', this.handleClose.bind(this))
        .on('message', this.handleMessage.bind(this))
    } catch (error) {
      console.error('Failed to bind socket:', error)
    }
  }

  private handleListening() {
    const address = this.socket.address()
    console.log(`Listening on ${address.address}:${address.port}`)
  }

  private handleError(error: Error) {
    console.error('Socket error:', error.message)
  }

  private handleClose() {
    console.log('Socket closed')
  }

  private handleMessage(message: Buffer, remote: RemoteInfo) {
    const packetId = message[0]
    if ((packetId & Bitflags.Valid) === 0) {
      // offline packet
    } else {
      // online packet
    }
  }
}

export {
  Raknet,
}
