We need a way to easily determine a raknet offline packet, and a connection established packet.

We have 3 main Packet instances "OfflinePacket", "OnlinePacket", and "AcknowledgePacket"
This is so we can easily detect how we need to process the packet.

Connection Sequence
  Client -> Server: OpenConnectionRequest1 extends OfflinePacket
  Server -> Client: OpenConnectionReply1 extends OfflinePacket
  Client -> Server: OpenConnectionRequest2 extends OfflinePacket
  Server -> Client: OpenConnectionReply2  extends OfflinePacket

From here on, raknet packets will be sent in a "FrameSet" packet. Within the FrameSet contains a Frame, which will contain the connection established packet.
  Client -> Server: ConnectionRequest extends OnlinePacket
  Server -> Client: ConnectionRequestAccepted extends OnlinePacket
  Client -> Server: NewIncomingConnection extends OnlinePacket

Once established, we will start receiving game packets.
  Client -> Server: GamePacket