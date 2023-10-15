import type { Raknet } from '../Raknet'

class Advertisement {
  private readonly raknet: Raknet

  public motd: string
  public protocol: number
  public version: string
  public playerCount: number
  public maxPlayerCount: number
  public worldName: string
  public gamemode: string

  public constructor(raknet: Raknet) {
    this.raknet = raknet
    this.motd = 'Raknet.js'
    this.protocol = this.raknet.protocol
    this.version = this.raknet.version
    this.playerCount = 0
    this.maxPlayerCount = this.raknet.maxPlayers
    this.worldName = 'world'
    this.gamemode = 'survival'
  }

  public offlineMessage(): string {
    const value = [
      'MCPE',
      this.motd,
      this.protocol,
      this.version,
      this.playerCount,
      this.maxPlayerCount,
      this.raknet.guid,
      this.worldName,
      this.gamemode,
    ].join(';') + ';'

    return value
  }
}

export {
  Advertisement,
}
