import { Buffer } from 'node:buffer';
import type { Socket, RemoteInfo } from 'node:dgram';
import { createSocket } from 'node:dgram';
import { setInterval, clearInterval } from 'node:timers';
import { Offline } from './Offline';
import { RaknetTickLength, Bitflags } from './constants';
import type { Session } from './session';
import { EventEmitter } from './utils';

interface RaknetEvents {
	Connect: [Session];
	Disconnect: [Session];
	Encapsulated: [Session, Buffer];
}

class Raknet extends EventEmitter<RaknetEvents> {
	protected readonly socket: Socket;
	public readonly protocol: number;
	public readonly version: string;
	public readonly guid: bigint;
	public readonly sessions: Map<string, Session>;
	public motd: string;

	protected address: string | null = null;
	protected port: number | null = null;
	protected timer: NodeJS.Timeout | null = null;
	public maxSessions: number;

	public constructor(protocol: number, version: string, motd?: string, maxSessions?: number) {
		super();
		this.protocol = protocol;
		this.version = version;
		this.motd = motd ?? 'Raknet.js';
		this.maxSessions = maxSessions ?? 10;
		this.socket = createSocket('udp4');
		this.guid = Buffer.allocUnsafe(8).readBigInt64BE();
		this.sessions = new Map();
		Offline.raknet = this;
	}

	public start(address: string, port: number): boolean {
		try {
			this.socket.bind(port, address, this.listening.bind(this));
			this.address = address;
			this.port = port;
			this.timer = setInterval(this.tick.bind(this), 10);
			return true;
		} catch {
			return false;
		}
	}

	private listening(): void {
		this.socket.on('message', this.incoming.bind(this));
	}

	public stop(): boolean {
		try {
			if (this.timer) clearInterval(this.timer!);
			this.socket.close();
			return true;
		} catch {
			return false;
		}
	}

	public getAddress(): string | null {
		return this.address;
	}

	public getPort(): number | null {
		return this.port;
	}

	private tick(): void {
		for (const session of this.sessions.values()) {
			session.tick();
		}
	}

	public send(buffer: Buffer, remote: RemoteInfo): void {
		this.socket.send(buffer, remote.port, remote.address);
	}

	public async incoming(buffer: Buffer, remote: RemoteInfo): Promise<void> {
		// Assemble the players session key.
		const key = `${remote.address}:${remote.port}`;
		// Check if the player has a session.
		const session = this.sessions.get(key);
		// If there is a session, let the session handle the packet.
		if (session && (buffer[0] & Bitflags.Valid) !== 0) return session.incoming(buffer);
		// check if we got an offline packet from a session
		if ((buffer[0] & Bitflags.Valid) !== 0) return console.log('Got offline packet from a session');
		// Handle the offline buffer.
		return Offline.incoming(buffer, remote);
	}

	public disconnect(remote: RemoteInfo): void {
		const str = '\u0000\u0000\u0008\u0015';
		const buff = Buffer.from(str, 'binary');
		this.socket.send(buff, remote.port, remote.address);
	}
}

export { Raknet };
