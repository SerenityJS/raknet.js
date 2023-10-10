import { Packet } from '../Packet'

class UnconnectedPing extends Packet {
  public time: bigint
  public clientGuid: bigint

  public constructor(buffer?: Buffer) {
    super(0x01, buffer)
  }

  protected encode(): Buffer {
    this.writeLong(this.time)
    this.writeMagic()
    this.writeLong(this.clientGuid)

    return this.getBuffer()
  }

  protected decode(): UnconnectedPing {
    this.time = this.readLong()
    this.readMagic()
    this.clientGuid = this.readLong()

    return this
  }
}

export {
  UnconnectedPing,
}
