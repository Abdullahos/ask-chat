import WebSocket, { WebSocketServer } from "ws";
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import SnowflakeId from 'snowflake-id';
import * as dotenv from "dotenv";


dotenv.config();
const port = process.env.SERVER_PORT;
const secret = process.env.JWT_SECRET;
const workerId = process.env.SNOWFLAKE_WORKER_ID;
const datacenterId = process.env.SNOWFLAKE_DATACENTER_ID;
const snowflake = new SnowflakeId.default({ workerId: workerId, datacenterId: datacenterId });


const publisher = createClient();
await publisher.connect();

const subscriber = createClient();
await subscriber.connect();

console.log(workerId)
const wsServer = new WebSocketServer({ port: port });
console.log(`Server is running on port ${port}...`);

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