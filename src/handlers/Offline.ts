import type { Raknet } from "../Raknet";
import type { RemoteInfo } from "node:dgram";

import { udpHeaderSize, maxMtuSize } from "../constants";
import { Connection } from "../connection";
import {
  UnconnectedPing,
  UnconnectedPong,
  OpenConnectionRequest1,
  OpenConnectionReply1,
  OpenConnectionRequest2,
  OpenConnectionReply2,
} from "../packets";

class OfflineHandler {
  private readonly raknet: Raknet;

  public constructor(raknet: Raknet) {
    this.raknet = raknet;
  }

  public handle(buffer: Buffer, rinfo: RemoteInfo): void {
    const id = buffer[0];
    switch (id) {
      default:
        return console.log("Unknown packet id:", id.toString(16));
      case UnconnectedPing.id:
        return this.handleUnconnectedPing(buffer, rinfo);
      case OpenConnectionRequest1.id:
        return this.handleOpenConnectionRequest1(buffer, rinfo);
      case OpenConnectionRequest2.id:
        return this.handleOpenConnectionRequest2(buffer, rinfo);
    }
  }

  public handleUnconnectedPing(buffer: Buffer, rinfo: RemoteInfo): void {
    const ping = new UnconnectedPing(buffer).decode();
    const pong = new UnconnectedPong();
    pong.time = ping.time;
    pong.serverGuid = this.raknet.guid;
    pong.motd = this.raknet.advertisement.offlineMessage();
    this.raknet.sendPacket(pong, rinfo);
  }

  public handleOpenConnectionRequest1(buffer: Buffer, rinfo: RemoteInfo): void {
    const request = new OpenConnectionRequest1(buffer).decode();
    // TODO yoink the person
    if (request.protocol !== 11)
      return console.log("Unknown protocol:", request.protocol);
    const reply = new OpenConnectionReply1();
    reply.serverGuid = this.raknet.guid;
    if (buffer.byteLength + udpHeaderSize > maxMtuSize)
      reply.mtuSize = maxMtuSize;
    else reply.mtuSize = buffer.byteLength + udpHeaderSize;
    reply.security = false;
    this.raknet.sendPacket(reply, rinfo);
  }

  public handleOpenConnectionRequest2(buffer: Buffer, rinfo: RemoteInfo): void {
    const request = new OpenConnectionRequest2(buffer).decode();

    if (this.raknet.connections.has(request.clientGuid)) {
      // Player is already connected, so disconnect them
      const existingConnection = this.raknet.connections.get(
        request.clientGuid
      );

      if (existingConnection) {
        // You may need to define a disconnect method in your Connection class
        existingConnection.disconnect();

        // Optionally, you can remove the connection from the connections map
        this.raknet.connections.delete(request.clientGuid);

        console.log("Kicked the already connected player");
      }

      return;
    }

    const reply = new OpenConnectionReply2();
    reply.serverGuid = this.raknet.guid;
    reply.clientAddress = request.serverAddress;
    reply.mtuSize = request.mtuSize;
    reply.encryption = false;

    // Create the connection instance for the user
    const connection = new Connection(
      this.raknet,
      rinfo,
      request.mtuSize,
      request.clientGuid
    );

    // Add the connection to the raknet instance
    this.raknet.connections.set(request.clientGuid, connection);
    this.raknet.sendPacket(reply, rinfo);
  }
}

export { OfflineHandler };
