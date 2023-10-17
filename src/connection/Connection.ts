import type { RemoteInfo } from "node:dgram";
import type { Raknet } from "../Raknet";
import type { BasePacket } from "../packets";

import { Bitflags, PacketReliability, RaknetEvent } from "../constants";
import { OnlineHandler } from "../handlers";
import {
  Frame,
  FrameSet,
  Ack,
  ConnectionRequest,
  ConnectionRequestAccepted,
  ConnectedPing,
  ConnectedPong,
  NewIncomingConnection,
  Disconnect,
  GamePacket,
} from "../packets";

class Connection {
  // Constructor variables
  private readonly raknet: Raknet;
  private readonly rinfo: RemoteInfo;
  public readonly mtuSize: number;
  public readonly guid: bigint;
  // TODO: needs a better name
  // statusManager
  // connectionStatus
  public readonly connectionState: OnlineHandler;

  // Connection variables
  public ping = 0;

  public constructor(
    raknet: Raknet,
    rinfo: RemoteInfo,
    mtuSize: number,
    guid: bigint
  ) {
    this.raknet = raknet;
    this.rinfo = rinfo;
    this.mtuSize = mtuSize;
    this.guid = guid;
    this.connectionState = new OnlineHandler(this, this.raknet);
  }

  public getAddress(): string {
    return this.rinfo.address;
  }

  public getPort(): number {
    return this.rinfo.port;
  }

  public sendPacket(packet: BasePacket): void {
    this.raknet.sendPacket(packet, this.rinfo);
  }

  public disconnect(): void {
    this.sendPacket(new Disconnect());
    this.raknet.emit(RaknetEvent.ConnectionClosed, this);
    this.raknet.connections.delete(this.guid);
  }
}

export { Connection };
