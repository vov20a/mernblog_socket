const express = require('express');
const { addUser, findUser, getRoomUsers, removeUser } = require('./users');
const http = require('http');
const { Server } = require('socket.io');
const route = require('./route');

const cors = require('cors');

const app = express();

app.use(cors({ origin: '*' }));
// app.use(cors({ origin: 'https://mernblog-stvy.onrender.com' }));
app.use(route);

const server = http.createServer(app);

const io = new Server(server, {
  // cors: { origin: 'https://mernblog-stvy.onrender.com' },
  cors: { origin: '*' },
  methods: ['GET', 'POST'],
});
io.on('connection', (socket) => {
  //start join
  socket.on('join', ({ name, room }) => {
    //get from client
    socket.join(room);
    //add user
    const { user, isExist } = addUser({ name, room });
    const userMessage = isExist ? `${user.name}, you are here again` : `${user.name} is here!`;
    //send to client
    socket.emit('message', {
      data: { user: { name: 'Admin' }, message: userMessage },
    });
    //send to other clients of room
    socket.broadcast.to(user.room).emit('message', {
      data: { user: { name: 'Admin' }, message: `${user.name} has joined` },
    });
    //check count of users in room
    io.to(user.room).emit('room', {
      data: { users: getRoomUsers(user.room) },
    });
  });
  //continue connection
  socket.on('sendMessage', ({ message, params }) => {
    const user = findUser(params);
    if (user) {
      io.to(user.room).emit('message', { data: { user, message } });
    }
  });
  //user left room
  socket.on('leftRoom', ({ params }) => {
    const user = removeUser(params);
    if (user) {
      const { room, name } = user;
      io.to(room).emit('message', {
        data: { user: { name: 'Admin' }, message: `${name} left ${room}` },
      });
      //check count of users in room
      io.to(room).emit('room', {
        data: { users: getRoomUsers(room) },
      });
    }
  });
  //end link
  io.on('disconnect', () => {
    console.log('Disconnect');
  });
  // io.disconnectSockets();
});

server.listen(5000, () => {
  console.log('Server started on port=5000');
});
