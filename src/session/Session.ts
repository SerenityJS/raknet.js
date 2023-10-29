import { Buffer } from 'node:buffer';
import type { RemoteInfo } from 'node:dgram';
import { BinaryStream } from 'binarystream.js';
import type { Raknet } from '../Raknet';
import { Priority, Bitflags, Status, Reliability } from '../constants';
import type { DataPacket } from '../packets';
import {
	Frame,
	Nack,
	FrameSet,
	ConnectionRequest,
	ConnectionRequestAccepted,
	Ack,
	NewIncomingConnection,
	ConnectedPing,
	ConnectedPong,
	Disconnect,
} from '../packets';

class Session {
	protected readonly raknet: Raknet;
	protected status: Status = Status.Connecting;
	public readonly remote: RemoteInfo;
	public readonly mtu: number;
	public readonly guid: bigint;

	// Outputs
	protected readonly outputBackupQueue: Map<number, Frame[]> = new Map();
	protected readonly outputOrderIndex: number[];
	protected readonly outputSequenceIndex: number[];
	protected outputFrameQueue: FrameSet;
	protected outputSequence = 0;
	protected outputReliableIndex = 0;
	protected outputFragmentIndex = 0;
	// Inputs
	protected readonly inputHighestSequenceIndex: number[];
	protected readonly lostFrameSequences = new Set<number>();
	protected readonly recievedFrameSequences = new Set<number>();
	protected readonly fragmentsQueue: Map<number, Map<number, Frame>> = new Map();
	protected readonly inputOrderIndex: number[];
	protected inputOrderingQueue: Map<number, Map<number, Frame>> = new Map();
	protected lastInputSequence = -1;

	public constructor(raknet: Raknet, remote: RemoteInfo, mtu: number, guid: bigint) {
		this.raknet = raknet;
		this.remote = remote;
		this.mtu = mtu;
		this.guid = guid;

		// Outputs
		this.outputFrameQueue = new FrameSet();
		this.outputFrameQueue.frames = [];
		this.outputOrderIndex = new Array(32).fill(0);
		this.outputSequenceIndex = new Array(32).fill(0);
		// Inputs
		this.inputOrderIndex = new Array(32).fill(0);
		for (let i = 0; i < 32; i++) {
			this.inputOrderingQueue.set(i, new Map());
		}

		this.inputHighestSequenceIndex = new Array(32).fill(0);
	}

	public tick(): void {
		// Check if we have to send an ACK or a NACK

		// Check if we have a received packet to send an ACK
		if (this.recievedFrameSequences.size > 0) {
			const ack = new Ack();
			ack.sequences = [...this.recievedFrameSequences].map((x) => {
				this.recievedFrameSequences.delete(x);
				return x;
			});
			this.send(ack.serialize());
		}

		if (this.lostFrameSequences.size > 0) {
			const pk = new Nack();
			pk.sequences = [...this.lostFrameSequences].map((x) => {
				this.lostFrameSequences.delete(x);
				return x;
			});
			this.send(pk.serialize());
		}

		// Send the queued frames on the tick
		return this.sendFrameQueue();
	}

	public send(buffer: Buffer): void {
		this.raknet.send(buffer, this.remote);
	}

	public sendPacket(packet: DataPacket): void {
		this.raknet.send(packet.serialize(), this.remote);
	}

	public async incoming(buffer: Buffer): Promise<void> {
		// Parse the packet header.
		const header = buffer[0] & 0xf0;
		switch (header) {
			// Checks if the packet doesnt have a specific header
			default: {
				const id = header.toString(16).length === 1 ? '0' + header.toString(16) : header.toString(16);
				return console.log(`Caught unhandled offline packet 0x${id} from ${this.remote.address}:${this.remote.port}!`);
			}

			// Checks if the packet is a valid packet, if so, we can handle it
			case Bitflags.Valid: {
				const packet = new FrameSet(buffer).deserialize();
				return this.handleFrameSet(packet);
			}

			// Handle the ack packets
			case Ack.id: {
				const packet = new Ack(buffer).deserialize();
				return this.handleAck(packet);
			}

			// Handle the nack packets
			case Nack.id: {
				const packet = new Nack(buffer).deserialize();
				return this.handleNack(packet);
			}
		}
	}

	private handleAck(ack: Ack): void {
		// Loops through the sequences and removes them from the backup queue
		for (const sequence of ack.sequences) {
			this.outputBackupQueue.delete(sequence);
		}
	}

	private handleNack(nack: Nack): void {
		// Loops through the sequences
		for (const sequence of nack.sequences) {
			if (this.outputBackupQueue.has(sequence)) {
				// Gets the lost frames and sends them again
				const frames = this.outputBackupQueue.get(sequence)!;
				for (const frame of frames) {
					this.sendFrame(frame, Priority.Immediate);
				}
			}
		}
	}

	private handleFrameSet(frameSet: FrameSet): void {
		// Check if the packet is a duplicate
		if (this.recievedFrameSequences.has(frameSet.sequence)) {
			return console.log(
				`Received duplicate packet ${frameSet.sequence} from ${this.remote.address}:${this.remote.port}!`,
			);
		}

		// Removes the packet from the lost queue
		this.lostFrameSequences.delete(frameSet.sequence);

		// Checks if the packet is out of order
		if (frameSet.sequence < this.lastInputSequence || frameSet.sequence === this.lastInputSequence) {
			return console.log(
				`Received out of order packet ${frameSet.sequence} from ${this.remote.address}:${this.remote.port}!`,
			);
		}

		// Add the frame to the received queue, Ack will be sent on the next tick
		this.recievedFrameSequences.add(frameSet.sequence);

		// Check if there are missing packets between the received packet and the last received one
		const differ = frameSet.sequence - this.lastInputSequence;

		// Check if the sequence has a hole due to a lost packet
		if (differ !== 1) {
			// Check if we are missing more than one packet
			for (let i = this.lastInputSequence + 1; i < frameSet.sequence; i++) {
				// Add the missing packet to the lost queue
				// Nack will be sent on the next tick
				if (!this.recievedFrameSequences.has(i)) {
					this.lostFrameSequences.add(i);
				}
			}
		}

		// Set the last received sequence
		this.lastInputSequence = frameSet.sequence;

		// Handle frames
		for (const frame of frameSet.frames) {
			this.handleFrame(frame);
		}
	}

	private handleFragment(frame: Frame): void {
		// Check if we already have the fragment id
		if (this.fragmentsQueue.has(frame.fragmentId)) {
			const value = this.fragmentsQueue.get(frame.fragmentId)!;
			value.set(frame.fragmentIndex, frame);

			// Check if we have all the fragments
			// Then we can rebuild the packet
			if (value.size === frame.fragmentSize) {
				const stream = new BinaryStream();
				// Loop through the fragments and write them to the stream
				for (let i = 0; i < value.size; i++) {
					const splitPacket = value.get(i)!;
					stream.write(splitPacket.body);
				}

				// Construct the new frame
				// Assign the values from the original frame
				const newFrame = new Frame();
				newFrame.reliability = frame.reliability;
				newFrame.reliableIndex = frame.reliableIndex;
				newFrame.sequenceIndex = frame.sequenceIndex;
				newFrame.orderIndex = frame.orderIndex;
				newFrame.orderChannel = frame.orderChannel;
				newFrame.body = stream.getBuffer();
				// Delete the fragment id from the queue
				this.fragmentsQueue.delete(frame.fragmentId);
				// Send the new frame to the handleFrame function
				return this.handleFrame(newFrame);
			}
		} else {
			// Add the fragment id to the queue
			this.fragmentsQueue.set(frame.fragmentId, new Map([[frame.fragmentIndex, frame]]));
		}
	}

	private handleFrame(frame: Frame): void {
		// Checks if the packet is fragmented
		if (frame.isFragmented()) return this.handleFragment(frame);

		// Checks if the packet is sequenced
		if (frame.isSequenced()) {
			if (
				frame.sequenceIndex < this.inputHighestSequenceIndex[frame.orderChannel] ||
				frame.orderIndex < this.inputOrderIndex[frame.orderChannel]
			) {
				return console.log(
					`Received out of order packet ${frame.sequenceIndex} from ${this.remote.address}:${this.remote.port}!`,
				);
			}

			// Set the new highest sequence index
			this.inputHighestSequenceIndex[frame.orderChannel] = frame.sequenceIndex + 1;
			// Handle the packet
			return this.handlePacket(frame);
		} else if (frame.isOrdered()) {
			// Check if the packet is out of order
			if (frame.orderIndex === this.inputOrderIndex[frame.orderChannel]) {
				this.inputHighestSequenceIndex[frame.orderChannel] = 0;
				this.inputOrderIndex[frame.orderChannel] = frame.orderIndex + 1;

				// Handle the packet
				this.handlePacket(frame);
				let i = this.inputOrderIndex[frame.orderChannel];
				const outOfOrderQueue = this.inputOrderingQueue.get(frame.orderChannel)!;
				for (; outOfOrderQueue.has(i); i++) {
					this.handlePacket(outOfOrderQueue.get(i)!);
					outOfOrderQueue.delete(i);
				}

				// Update the queue
				this.inputOrderingQueue.set(frame.orderChannel, outOfOrderQueue);
				this.inputOrderIndex[frame.orderChannel] = i;
			} else if (frame.orderIndex > this.inputOrderIndex[frame.orderChannel]) {
				const unordered = this.inputOrderingQueue.get(frame.orderChannel)!;
				unordered.set(frame.orderIndex, frame);
			}
		} else {
			// Handle the packet, no need to format it
			return this.handlePacket(frame);
		}
	}

	private handlePacket(frame: Frame): void {
		// Parse the packet header.
		const header = frame.body[0];
		// Check the session status.
		if (this.status === Status.Connecting) {
			switch (header) {
				default: {
					const id = header.toString(16).length === 1 ? '0' + header.toString(16) : header.toString(16);
					return console.log(
						`Caught unhandled connecting packet 0x${id} from ${this.remote.address}:${this.remote.port}!`,
					);
				}

				case ConnectionRequest.id: {
					const packet = new ConnectionRequest(frame.body).deserialize();
					return this.handleConnectionRequest(packet);
				}

				case NewIncomingConnection.id: {
					this.status = Status.Connected;
					this.raknet.emit('Connect', this);
					break;
				}

				case Disconnect.id: {
					this.status = Status.Disconnecting;
					this.raknet.sessions.delete(`${this.remote.address}:${this.remote.port}`);
					this.status = Status.Disconnected;
					this.tick();
					break;
				}
			}
		} else if (this.status === Status.Connected) {
			switch (header) {
				default: {
					const id = header.toString(16).length === 1 ? '0' + header.toString(16) : header.toString(16);
					return console.log(
						`Caught unhandled connected packet 0x${id} from ${this.remote.address}:${this.remote.port}!`,
					);
				}

				case ConnectedPing.id: {
					const packet = new ConnectedPing(frame.body).deserialize();
					return this.handlePing(packet);
				}

				case Disconnect.id: {
					this.status = Status.Disconnecting;
					this.raknet.emit('Disconnect', this);
					this.raknet.sessions.delete(`${this.remote.address}:${this.remote.port}`);
					this.status = Status.Disconnected;
					this.tick();
					break;
				}

				case 0xfe: {
					this.raknet.emit('Encapsulated', this, frame.body);
					break;
				}
			}
		}
	}

	public sendFrame(frame: Frame, priority: Priority): void {
		// Check if the packet is sequenced or ordered
		if (frame.isSequenced()) {
			// Set the order index and the sequence index
			frame.orderIndex = this.outputOrderIndex[frame.orderChannel];
			frame.sequenceIndex = this.outputSequenceIndex[frame.orderChannel]++;
		} else if (frame.isOrderExclusive()) {
			// Set the order index and the sequence index
			frame.orderIndex = this.outputOrderIndex[frame.orderChannel]++;
			this.outputSequenceIndex[frame.orderChannel] = 0;
		}

		// Set the reliable index
		frame.reliableIndex = this.outputReliableIndex++;

		// Split packet if bigger than MTU size
		const maxSize = this.mtu - 6 - 23;
		if (frame.body.byteLength > maxSize) {
			const buffer = Buffer.from(frame.body);
			const fragmentId = this.outputFragmentIndex++ % 65_536;
			for (let i = 0; i < buffer.byteLength; i += maxSize) {
				if (i !== 0) frame.reliableIndex = this.outputReliableIndex++;

				frame.body = buffer.slice(i, i + maxSize);
				frame.fragmentIndex = i / maxSize;
				frame.fragmentId = fragmentId;
				frame.fragmentSize = Math.ceil(buffer.byteLength / maxSize);
				this.addFrameToQueue(frame, priority | Priority.Immediate);
			}
		} else {
			return this.addFrameToQueue(frame, priority);
		}
	}

	public addFrameToQueue(frame: Frame, priority: Priority): void {
		let length = 4;
		// Add the length of the frame to the length
		for (const queuedFrame of this.outputFrameQueue.frames) {
			length += queuedFrame.getByteLength();
		}

		// Check if the frame is bigger than the MTU, if so, send the queue
		if (length + frame.getByteLength() > this.mtu - 36) {
			this.sendFrameQueue();
		}

		// Add the frame to the queue
		this.outputFrameQueue.frames.push(frame);

		// If the priority is immediate, send the queue
		if (priority === Priority.Immediate) return this.sendFrameQueue();
	}

	public sendFrameQueue(): void {
		// Check if the queue is empty
		if (this.outputFrameQueue.frames.length > 0) {
			// Set the sequence of the frame set
			this.outputFrameQueue.sequence = this.outputSequence++;
			// Send the frame set
			this.sendFrameSet(this.outputFrameQueue);
			// Set the queue to a new frame set
			this.outputFrameQueue = new FrameSet();
			this.outputFrameQueue.frames = [];
		}
	}

	private sendFrameSet(frameSet: FrameSet): void {
		// Send the frame set
		this.send(frameSet.serialize());
		// Add the frame set to the backup queue
		this.outputBackupQueue.set(
			frameSet.sequence,
			frameSet.frames.filter((frame) => frame.isReliable()),
		);
	}

	private handleConnectionRequest(packet: ConnectionRequest): void {
		const accepted = new ConnectionRequestAccepted();
		accepted.clientAddress = { address: this.remote.address, port: this.remote.port, version: 4 };
		accepted.systemAddresses = [];
		accepted.requestTimestamp = packet.timestamp;
		accepted.timestamp = BigInt(Date.now());

		const frame = new Frame();
		frame.reliability = Reliability.Unreliable;
		frame.orderChannel = 0;
		frame.body = accepted.serialize();

		this.sendFrame(frame, Priority.Immediate);
	}

	private handlePing(packet: ConnectedPing): void {
		const pong = new ConnectedPong();
		pong.timestamp = packet.timestamp;
		pong.pingTimestamp = packet.timestamp;
		pong.timestamp = BigInt(Date.now());
		this.send(pong.serialize());
	}
}

export { Session };
