import { BasePacket } from '../BasePacket'

abstract class OnlinePacket extends BasePacket {
  public static id: number
}

export {
  OnlinePacket,
}
