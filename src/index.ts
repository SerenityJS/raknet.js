import { Raknet } from './Raknet'
import { RaknetEvent } from './constants'

const server = new Raknet()

server.listen('127.0.0.1', 19132)

server.on(RaknetEvent.Listening, () => {
  console.log('Listening on:', server.socket.address().address, server.socket.address().port)
})

server.on(RaknetEvent.ConnectionOpened, (connection) => {
  console.log('New connection:', connection.getAddress(), connection.getPort())
})

server.on(RaknetEvent.ConnectionClosed, (connection) => {
  console.log('Connection closed:', connection.getAddress(), connection.getPort())
})

server.on(RaknetEvent.GamePacket, (packet, connection) => {
  console.log('Game packet:', packet.body, '\nFrom:', connection.getAddress(), connection.getPort())
})