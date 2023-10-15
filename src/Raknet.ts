import 'reflect-metadata'

import type { Connection } from './connection'
import type { BasePacket, GamePacket } from './packets' 

import { Socket, createSocket, RemoteInfo } from 'node:dgram'
import { OfflinePacket, OnlinePacket, AcknowledgePacket } from './packets'
import { OfflineHandler } from './Offline'
import { EventEmitter } from './utils'
import { RaknetEvent } from './constants'

interface RaknetEvents {
  [RaknetEvent.Listening]: []
  [RaknetEvent.ConnectionOpened]: [Connection]
  [RaknetEvent.ConnectionClosed]: [Connection]
  [RaknetEvent.GamePacket]: [GamePacket, Connection]
}

class Raknet extends EventEmitter<RaknetEvents> {
  public readonly socket: Socket
  public readonly guid: bigint
  public readonly offline: OfflineHandler
  public readonly connections: Map<bigint, Connection>

  public constructor() {
    super()
    this.socket = createSocket('udp4')
    this.guid = Buffer.allocUnsafe(8).readBigInt64BE()
    this.offline = new OfflineHandler(this)
    this.connections = new Map()
  }

  public listen(address: string, port: number) {
    try {
      // Binds the socket
      this.socket.bind(port, address)
        .on('message', this.handleMessage.bind(this))
        .on('listening', this.handleListening.bind(this))
    } catch (error) {
      console.error('Failed to bind socket:', error)
    }
  }

  public getConnectionFromRinfo(rinfo: RemoteInfo): Connection | undefined {
    return [...this.connections.values()]
      .find((x) => x.getAddress() === rinfo.address && x.getPort() === rinfo.port)
  }

  public async sendPacket(packet: BasePacket, rinfo: RemoteInfo): Promise<void> {
    if (packet instanceof OfflinePacket || packet instanceof AcknowledgePacket) {
      // Handle offline & acknowledegement packet encoding
      // Packet doesnt need to be framed, so send as is.
      return this.socket.send(packet.encode(), rinfo.port, rinfo.address)
    } else if (packet instanceof OnlinePacket) {
      // Handle online packet encoding (frame this packet)
      // Packet does need to be framed, so we need to frame it before sending.
      // Framing needs to take place within the connection, as the sequence number is connection specific.
      const connection = this.getConnectionFromRinfo(rinfo)
      if (!connection) return console.log('Unknown connection with info:', rinfo)

      // Frame the packet
      const frameSet = connection.framePacket(packet)
      if (!frameSet) return console.log('Failed to frame packet:', packet)

      // Send it
      return this.socket.send(frameSet.encode(), rinfo.port, rinfo.address)
    } else {
      // TODO: Handle custom packet encoding
      console.log('Custom packet:', packet)
    }
  }

  private handleMessage(buffer: Buffer, rinfo: RemoteInfo): void {
    const header = buffer[0]
    if ((header & 0x80) === 0) {
      this.offline.handle(buffer, rinfo)
    } else {
      const connection = [...this.connections.values()]
        .find((x) => x.getAddress() === rinfo.address && x.getPort() === rinfo.port)
      if (!connection) return console.log('Unknown connection with info:', rinfo)
      connection.handleBuffer(buffer)
    }
  }

  private handleListening(): void {
    this.emit(RaknetEvent.Listening)

    // TODO: Move elsewhere
    setInterval(() => {
      for (const connection of this.connections.values()) {
        connection.update()
      }
    }, 10)
  }
}

export {
  Raknet,
}
