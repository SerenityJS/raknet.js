import { Bitflags, udpHeaderSize, maxMtuSize } from './constants'
import { OfflineClient, Client, ClientStatus } from './client'
import { Socket, createSocket, RemoteInfo } from 'node:dgram'
import { EventEmitter } from './utils'

import {
  UnconnectedPing,
  OpenConnectionRequest1,
  OpenConnectionRequest2,
  ConnectionRequest,
} from './packets'

enum Gamemode {
  Survival,
  Creative,
  Adventure,
  Spectator,
}

interface RaknetEvents {
  Binary: [Buffer, RemoteInfo]
  UnconnectedPing: [UnconnectedPing, RemoteInfo]
  OpenConnectionRequest1: [OpenConnectionRequest1, RemoteInfo]
  OpenConnectionRequest2: [OpenConnectionRequest2, RemoteInfo]
  ConnectionRequest: [ConnectionRequest, Client]
  ClientConnected: [Client]
  ClientDisconnected: [Client, ClientStatus]
  Encapsulated: [Buffer, Client]
  Error: [...string[]]
  Listening: []
  Close: []
}

class Raknet extends EventEmitter<RaknetEvents> {
  public readonly protocol: number
  public readonly version: string
  public readonly maxClients: number
  public readonly socket: Socket = createSocket('udp4')
  public readonly guid: bigint = Buffer.allocUnsafe(8).readBigInt64BE()
  public readonly tps = 10
  public readonly clients = new Map<bigint, Client>()

  public motd = 'Raknet.js'
  public gamemode = Gamemode.Survival
  protected interval: NodeJS.Timeout | null = null

  public constructor(protocol: number, version: string, maxClients: number = 20) {
    super()
    this.protocol = protocol
    this.version = version
    this.maxClients = maxClients
  }

  public start(address: string, port: number = 19132): Raknet {
    try {
      // Bind to the port
      this.socket.bind(port, address)//.unref()
        // Bind the listeners
        .on('listening', this.emit.bind(this, 'Listening'))
        .on('close', this.emit.bind(this, 'Close'))
        .on('error', (error: Error) => {
          this.emit('Error', error.message, error.stack!)
        })
        .on('message', this.incoming.bind(this))
      // Starts the raknet ticking interval
      this.interval = setInterval(this.tick.bind(this), this.tps)

      return this
    } catch (error: any) {
      this.emit('Error', error)

      return this
    }
  }

  public stop(): Raknet {
    // Close the socket
    this.socket.close()
    // Clear the interval
    if (this.interval) clearInterval(this.interval!)
    // Disconnect all clients
    for (const client of this.clients.values()) {
      client.disconnect()
    }

    return this
  }

  public tick(): void {
    for (const client of this.clients.values()) {
      // Checks if the client is in the process of disconnecting or is already disconnected.
      if (
        client.status === ClientStatus.Disconnecting || 
        client.status === ClientStatus.Disconnected
      ) continue
      
      // Tick the client
      client.tick()
    }
  }

  public send(buffer: Buffer, address: string, port: number): void {
    // Send raw data to the specified address and port.
    this.socket.send(buffer, port, address)
  }

  public async incoming(buffer: Buffer, remote: RemoteInfo): Promise<void> {
    // Emit the binary event, if not, return.
    const event = await this.emit('Binary', buffer, remote)
    if (!event) return

    // Get the client, if not, handle offline client.
    const client = [...this.clients.values()].find((x) => x.remote.address === remote.address && x.remote.port === remote.port)

    // If a client exsis, let the client handle the incoming packet.
    if (client && (buffer[0] & Bitflags.Valid) !== 0) return client.incoming(buffer)

    // Check if we got an offline packet from a online user.
    if ((buffer[0] & Bitflags.Valid) !== 0) return

    // Handle the offline client.
    return OfflineClient.incoming(this, buffer, remote)
  }
}

export {
  Raknet,
  Gamemode,
}
