// index.js
const express = require('express');
const cors = require('cors');

const app = express();
const server = require('http').createServer(app);
const socketIO = require('socket.io');

const allowedOrigins = [
  'http://localhost:5173',                         // local dev
  'http://localhost:4173',                         // local production build
  'https://voice-drop.vercel.app'                  // deployed frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin: ' + origin));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = socketIO(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Socket.IO CORS not allowed: ' + origin));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.json());
app.get('/', (req, res) => {
  res.send('Server is running ✅');
});

const users = new Set();
const userSockets = new Map(); // socket.id ➝ userName

io.on('connection', (socket) => {
  console.log('🟢 New socket connected');

  let userName = null;

  socket.on('user joined', (name) => {
    users.delete(userName);
    userName = name;
    users.add(name);
    userSockets.set(socket.id, name);
    io.emit('live users', Array.from(users));
  });

  socket.on('client message', (msg) => {
    io.emit('server message', msg);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Socket disconnected');
    const name = userSockets.get(socket.id);
    userSockets.delete(socket.id);

    if(name) {
      const stillConnected = Array.from(userSockets.values()).includes(name);
      if(!stillConnected) {
        users.delete(name);
      }
    }

    io.emit('live users', Array.from(users));
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
