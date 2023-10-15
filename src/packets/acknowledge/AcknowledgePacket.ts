import { BasePacket } from '../BasePacket'

abstract class AcknowledgePacket extends BasePacket {
  public static id: number
}

export {
  AcknowledgePacket,
}
