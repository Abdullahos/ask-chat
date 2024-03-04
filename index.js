import WebSocket, { WebSocketServer } from "ws";
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import SnowflakeId from 'snowflake-id';
const snowflake = new SnowflakeId.default({ workerId: 1, datacenterId: 1 });

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
    const messageObj = JSON.parse(message);
    if (messageObj.type == 'chat') {
      messageObj.id = generateMessageId();
      publisher.publish("chat", JSON.stringify(messageObj));
    }
    else if (messageObj.type == 'access-token') {
      validateJWTAndUpdateOnlineUsers(messageObj.data, wsConnection);
    }
    else if (messageObj.type == 'heartbeat') {
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

function generateMessageId() {
  return snowflake.generate();
}