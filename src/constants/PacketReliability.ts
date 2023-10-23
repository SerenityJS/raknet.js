enum PacketReliability {
  Unreliable,
  UnreliableSequenced,
  Reliable,
  ReliableOrdered,
  ReliableSequenced,
  UnreliableWithAckReceipt,
  ReliableWithAckReceipt,
  ReliableOrderedWithAckReceipt,
}

export {
  PacketReliability,
}