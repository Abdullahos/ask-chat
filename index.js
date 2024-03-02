import WebSocket, { WebSocketServer } from "ws";
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
const secret = '2E#23!dsQrwr12_23';

const publisher = createClient();
await publisher.connect();

publisher.on('error', err => console.log('Redis Client Error', err));


const subscriber = createClient();
await subscriber.connect();


const wsServer = new WebSocketServer({ port: 3000 });
console.log("Server is running...");

const onlineUsers = new Map();

await subscriber.subscribe('chat', (message) => {
  let messageObj = JSON.parse(message);
  let connections = onlineUsers.get(messageObj.recipientId)
  if (connections) {
    connections.forEach(connection => connection.send(message));
  }
});

wsServer.on('connection', async function connection(wsConnection) {
  wsConnection.on('message', function incoming(message) { 
    const data = JSON.parse(message);
    if (data.type === 'chat') {
      publisher.publish("chat", message);
    }
    else if (data.type === 'access-token') {
      validateJWTAndUpdateOnlineUsers(data.data, wsConnection);
    }
    else if (data.type === 'heartbeat') {
      updateLastActiveTime(userId);
    }
  });

  wsConnection.on('close', function close() {
    console.log('connection closed')
  });
});

function updateLastActiveTime(userId) {
  // Update user's last active time in a database or key-value store
}

function validateJWTAndUpdateOnlineUsers(token, connection) {
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error('Invalid token:', err);
    } else {
      pushActiveConnection(decoded._id, connection);
    }
  });
}

function pushActiveConnection(userId, wsConnection) {
  let activeConnection = onlineUsers.get(userId);
  if (activeConnection && activeConnection.length > 0) {
    activeConnection.push(wsConnection);
    onlineUsers.set(userId, activeConnection);
  }
  else onlineUsers.set(userId, [wsConnection]);
  console.log(userId + " Connected")
}