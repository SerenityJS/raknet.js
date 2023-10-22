import { DataPacket } from "../DataPacket"

abstract class AcknowledgePacket extends DataPacket {
  public static id: number
}

export {
  AcknowledgePacket,
}