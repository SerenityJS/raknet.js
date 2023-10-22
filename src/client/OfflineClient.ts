import type { Raknet } from '../Raknet'
import type { RemoteInfo } from 'node:dgram'

import { udpHeaderSize, maxMtuSize } from '../constants'
import { Gamemode } from '../Raknet'
import { Client } from '../client'
import {
  UnconnectedPing,
  UnconnectedPong,
  NoFreeIncomingConnections,
  OpenConnectionRequest1,
  OpenConnectionReply1,
  OpenConnectionRequest2,
  OpenConnectionReply2,
} from '../packets'

class OfflineClient {
  public static async incoming(raknet: Raknet, buffer: Buffer, remote: RemoteInfo): Promise<void> {
    // Handle the proper packet.
    switch(buffer[0]) {
      default:
        raknet.emit('Error', `Unhandled packet with id 0x${buffer[0].toString(16)} from ${remote.address}:${remote.port}`)
        return
      case UnconnectedPing.id:
        return OfflineClient.handleUnconnectedPing(raknet, new UnconnectedPing(buffer).deserialize(), remote)
      case OpenConnectionRequest1.id:
        return OfflineClient.handleOpenConnectionRequest1(raknet, new OpenConnectionRequest1(buffer).deserialize(), remote)
      case OpenConnectionRequest2.id:
        return OfflineClient.hanldeOpenConnectionRequest2(raknet, new OpenConnectionRequest2(buffer).deserialize(), remote)
    }
  }

  public static async handleUnconnectedPing(raknet: Raknet, ping: UnconnectedPing, remote: RemoteInfo): Promise<void> {
    // Emit the unconnected ping event, if not, return.
    const event = await raknet.emit('UnconnectedPing', ping, remote)
    if (!event) return

    // Construct the unconnected pong packet.
    const pong = new UnconnectedPong()
    pong.time = ping.time
    pong.serverGuid = raknet.guid
    pong.motd = [
      'MCPE', // MCEE or Education Edition
      raknet.motd, // Server message of the day
      raknet.protocol, // Server protocol version
      raknet.version, // Server version
      [...raknet.clients.values()].length, // Online players
      raknet.maxClients,  // Max players
      raknet.guid, // Server guid
      'Raknet.js', // Change this? or not? Self-advertising :)
      Gamemode[raknet.gamemode], // Gamemode
      1, // Has to be 1 for some reason.
      raknet.socket.address().port, // Ipv4 port
      raknet.socket.address().port + 1, // Ipv6 port
    ].join(';') + ';'

    // Send the unconnected pong packet to the client.
    raknet.send(pong.serialize(), remote.address, remote.port)
  }

  public static async handleOpenConnectionRequest1(raknet: Raknet, request: OpenConnectionRequest1, remote: RemoteInfo): Promise<void> {
    // Emit the open connection request 1 event, if not, return.
    const event = await raknet.emit('OpenConnectionRequest1', request, remote)
    if (!event) return

    // Construct the open connection reply 1 packet.
    const reply = new OpenConnectionReply1()
    reply.serverGuid = raknet.guid
    if (request.getBuffer().byteLength + udpHeaderSize > maxMtuSize) reply.mtuSize = maxMtuSize;
    else reply.mtuSize = request.getBuffer().byteLength + udpHeaderSize;
    reply.security = false

    // Send the open connection reply 1 packet to the client.
    raknet.send(reply.serialize(), remote.address, remote.port)
  }

  public static async hanldeOpenConnectionRequest2(raknet: Raknet, request: OpenConnectionRequest2, remote: RemoteInfo): Promise<void> {
    // Emit the open connection request 2 event, if not, return.
    const event = await raknet.emit('OpenConnectionRequest2', request, remote)
    if (!event) return
    // Checks if the max clients has been reached.
    if (raknet.clients.size >= raknet.maxClients) {
      const reject = new NoFreeIncomingConnections()
      reject.serverGuid = raknet.guid
      // Sending the packet to the client.
      return raknet.send(reject.serialize(), remote.address, remote.port)
    }

    // TODO: Yoink the person
    if (raknet.clients.has(request.clientGuid)) {
      raknet.emit('Error', `Client with guid ${request.clientGuid} already exists.`)
      return
    }

    // Construct the open connection reply 2 packet.
    const reply = new OpenConnectionReply2()
    reply.serverGuid = raknet.guid
    reply.clientAddress = request.serverAddress
    reply.mtuSize = request.mtuSize
    reply.encryption = false

    // Create the client.
    const client = new Client(raknet, remote, request.clientGuid, request.mtuSize)
    raknet.clients.set(request.clientGuid, client)

    // Send the open connection reply 2 packet to the client.
    raknet.send(reply.serialize(), remote.address, remote.port)
  }
}

export {
  OfflineClient,
}
