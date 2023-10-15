import { BasePacket } from '../BasePacket'

abstract class OfflinePacket extends BasePacket {
  public static id: number
}

export {
  OfflinePacket,
}
