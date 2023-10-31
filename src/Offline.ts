import type { Buffer } from 'node:buffer';
import type { RemoteInfo } from 'node:dgram';
import type { Raknet } from './Raknet';
import { Protocol, MaxMtuSize, udpHeaderSize } from './constants';
import {
	OpenConnectionRequest2,
	OpenConnectionRequest1,
	OpenConnectionReply1,
	UnconnectedPing,
	UnconnectedPong,
	IncompatibleProtocol,
	OpenConnectionReply2,
} from './packets';
import { Session } from './session';

class Offline {
	public static raknet: Raknet;

	public static incoming(buffer: Buffer, remote: RemoteInfo): void {
		// Parse the packet header.
		const header = buffer[0];
		switch (header) {
			default: {
				const id = header.toString(16).length === 1 ? '0' + header.toString(16) : header.toString(16);
				return console.log(`Caught unhandled offline packet 0x${id} from ${remote.address}:${remote.port}!`);
			}

			case UnconnectedPing.id: {
				const packet = new UnconnectedPing(buffer).deserialize();
				return this.handleUnconnectedPing(packet, remote);
			}

			case OpenConnectionRequest1.id: {
				const packet = new OpenConnectionRequest1(buffer).deserialize();
				return this.handleOpenConnectionRequest1(packet, remote);
			}

			case OpenConnectionRequest2.id: {
				const packet = new OpenConnectionRequest2(buffer).deserialize();
				return this.handleOpenConnectionRequest2(packet, remote);
			}
		}
	}

	private static handleUnconnectedPing(ping: UnconnectedPing, remote: RemoteInfo): void {
		const pong = new UnconnectedPong();
		pong.timestamp = ping.timestamp;
		pong.serverGuid = this.raknet.guid;
		pong.magic = ping.magic;
		pong.motd =
			[
				'MCPE', // MCEE for Education Edition
				this.raknet.motd, // Server message of the day
				this.raknet.protocol, // Server protocol version
				this.raknet.version, // Server version
				[...this.raknet.sessions.values()].length, // Online players
				this.raknet.maxSessions, // Max players
				this.raknet.guid, // Server guid
				'Raknet.js', // Change this? or not? Self-advertising :)
				'survival', // Gamemode
				1, // Has to be 1 for some reason.
				this.raknet.getPort()!, // Ipv4 port
				this.raknet.getPort()! + 1, // Ipv6 port
			].join(';') + ';';
		this.raknet.send(pong.serialize(), remote);
	}

	private static handleOpenConnectionRequest1(request: OpenConnectionRequest1, remote: RemoteInfo): void {
		// Check if the protocol is supported.
		if (request.protocol !== Protocol) {
			// Create an incompatible protocol packet.
			const incompatible = new IncompatibleProtocol();
			incompatible.protocol = request.protocol;
			incompatible.magic = request.magic;
			incompatible.serverGuid = this.raknet.guid;
			// Send it to the offline player.
			return this.raknet.send(incompatible.serialize(), remote);
		}

		// Create the reply packet.
		const reply = new OpenConnectionReply1();
		reply.serverGuid = this.raknet.guid;
		reply.magic = request.magic;
		reply.useSecurity = false;

		// Check the MTU size, and adjust it if needed.
		if (request.getBuffer().byteLength + udpHeaderSize > MaxMtuSize) {
			reply.mtu = MaxMtuSize;
		} else {
			reply.mtu = request.getBuffer().byteLength + udpHeaderSize;
		}

		// Send the reply packet.
		return this.raknet.send(reply.serialize(), remote);
	}

	private static handleOpenConnectionRequest2(request: OpenConnectionRequest2, remote: RemoteInfo): void {
		// Create the reply packet.
		const reply = new OpenConnectionReply2();
		reply.serverGuid = this.raknet.guid;
		reply.clientAddress = { address: remote.address, port: remote.port, version: 4 };
		reply.mtu = request.mtu;
		reply.useEncryption = false;

		const session = new Session(this.raknet, remote, reply.mtu, request.clientGuid);
		this.raknet.sessions.set(`${remote.address}:${remote.port}`, session);

		// Send the reply packet.
		return this.raknet.send(reply.serialize(), remote);
	}
}

export { Offline };
