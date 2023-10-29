# raknet.js

Raknet package written in Typescript!

This is still a very early work in progress. Contributions are welcomed!

## Usage

```ts
import { Raknet } from '@serenityjs/raknet.js';

// Create the raknet server
const server = new Raknet(622, '1.20.40');

// Start the server
server.start('0.0.0.0', 19132);

server.on('Connect', (session) => {
	console.log(`Session started with guid "${session.guid}"!`);
});

server.on('Disconnect', (session) => {
	console.log(`Session ended with guid "${session.guid}"!`);
});

server.on('Encapsulated', (session, buffer) => {});
```
