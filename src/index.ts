import { Raknet } from './Raknet'
import { RaknetEvent } from './constants'
import { BinaryStream } from 'binarystream.js'

const server = new Raknet(618, '1.20.32')

server.listen('127.0.0.1', 19132)

server.on(RaknetEvent.Listening, () => {
  console.log(`Listening on ${server.socket.address().address}:${server.socket.address().port}`)
})

server.on(RaknetEvent.GamePacket, (bin, size, connection) => {
  const stream = new BinaryStream(bin)
  const id = stream.readUInt8()
})
