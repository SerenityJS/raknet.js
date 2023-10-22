enum PacketReliability {
  Unreliable,
  UnreliableSequenced,
  Reliable,
  ReliableOrdered,
  ReliableSequenced,
  UnreliableWithAckReceipt,
  UnreliableSequencedWithAckReceipt,
  ReliableWithAckReceipt,
  ReliableOrderedWithAckReceipt,
  ReliableSequencedWithAckReceipt,
}

export {
  PacketReliability,
}