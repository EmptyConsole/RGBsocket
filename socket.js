const express = require("express");
const http = require("http");
const { start } = require("repl");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// =========================
// ROOM STORE
// =========================
const rooms = Object.create(null);
// rooms = {
//   roomName: { clients: { socketId: true } }
// }

function isValidRoomName(name) {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    name !== "__proto__" &&
    name !== "constructor"
  );
}

// =========================
// CALLBACKS
// =========================
const callbacks = {
  onConnect: (socket) => {},
  onJoin: (socket, room) => {},
  onLeave: (socket, room) => {},
  onRoomCreate: (room) => {},
  onRoomDelete: (room) => {},
  onMessage: (socket, room, data) => {},
  onDisconnect: (socket) => {},
};

function tick(roomName){
  if(!rooms[roomName]){
return;
  }
  if(rooms[roomName].time%=rooms[roomName].roundTime==0){
rooms[roomName].time=0;
rooms[roomName].rgb=randomRGB();
  }
  rooms[roomName].time+=100;
socket.to(roomName).emit("recieveData", {
      time:rooms[roomName].time,
      players:rooms[roomName].clients,
      rgb:rooms[roomName].rgb
    });
    
}
function randomRGB() {
  return {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256)
  };
}
// =========================
// SOCKET SETUP
// =========================
io.on("connection", (socket) => {
  callbacks.onConnect(socket);

  socket.emit("rooms_list", rooms);

  // -----------------------
  // CREATE ROOM
  // -----------------------
  socket.on("create_room", (roomName) => {
    roomName = String(roomName);
    if (!isValidRoomName(roomName)) return;

    if (!rooms[roomName]) {
      rooms[roomName] = { clients: {}, ticker: setInterval(tick,100,roomName),time: 0, rgb: {r: 0, g: 0, b:0},roundTime: 5000};
      callbacks.onRoomCreate(roomName);
    }

    joinRoom(socket, roomName);
  });

  // -----------------------
  // JOIN ROOM
  // -----------------------
  socket.on("join_room", (roomName,user) => {
    if (!isValidRoomName(roomName)) return;
    if (!rooms[roomName]) return;

    joinRoom(socket, roomName,user);
  });

  // -----------------------
  // LEAVE ROOM
  // -----------------------
  socket.on("leave_room", (roomName) => {
    if (!isValidRoomName(roomName)) return;
    leaveRoom(socket, roomName);
  });

  // -----------------------
  // MESSAGE TO ROOM
  // -----------------------
  socket.on("message", ({ room, data }) => {
    if (!isValidRoomName(room)) return;
    if (!rooms[room]) return;

    // only allow if user is in room
    if (!rooms[room].clients[socket.id]) return;

    socket.to(room).emit("message", {
      id: socket.id,
      room,
      data,
    });

    callbacks.onMessage(socket, room, data);
  });

  // -----------------------
  // DISCONNECT
  // -----------------------
  socket.on("disconnect", () => {
    // leave ALL rooms this socket joined
    for (const roomName in rooms) {
      if (rooms[roomName].clients[socket.id]) {
       // leaveRoom(socket, roomName);
      }
    }

   // callbacks.onDisconnect(socket);
  });

  // =========================
  // HELPERS
  // =========================

  function joinRoom(socket, roomName, user) {
    // prevent duplicate joins
    if (rooms[roomName].clients[socket.id]) return;

    socket.join(roomName);
    rooms[roomName].clients[socket.id] = {username: user, score: 0, sub: false};

    socket.emit("joined_room", roomName);
   // socket.to(roomName).emit("user_joined", socket.id);

    io.emit("rooms_list", rooms);
    callbacks.onJoin(socket, roomName);
  }

  function leaveRoom(socket, roomName) {
    if (!rooms[roomName]) return;
    if (!rooms[roomName].clients[socket.id]) return;

    socket.leave(roomName);
    delete rooms[roomName].clients[socket.id];

    //socket.to(roomName).emit("user_left", socket.id);

    // delete empty room
    if (Object.keys(rooms[roomName].clients).length === 0) {
      delete rooms[roomName];
      callbacks.onRoomDelete(roomName);
    }

    io.emit("rooms_list", rooms);

    callbacks.onLeave(socket, roomName);
  }
});

// =========================
// START SERVER
// =========================
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});