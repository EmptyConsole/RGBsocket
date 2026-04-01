const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });


const PORT = process.env.PORT || 3000;
var lobbyTicks = {};

/*
 ROOMS STRUCTURE:
 rooms = {
   roomName: {
     players: {
       socketId: { x, y, angle }
     }
   }
 }
*/
// Use a null-prototype object to reduce prototype-pollution risks
let rooms = Object.create(null);


function isValidRoomName(name) {
 return (
   typeof name === "string" &&
   name.length > 0 &&
   name !== "__proto__" &&
   name !== "constructor"
 );
}
function intervalTick(name){
  if(lobbyTicks[name]){
    lobbyTicks[name].untilAuto+=100;
    if(rooms[name]?.startingPlayers){
    if(Object.keys(rooms[name].players).length>=2||(lobbyTicks[name].untilAuto>=15000&&Object.keys(rooms[name].players).length>=2)){
  lobbyTicks[name].untilStart-=100;
    }
  }
  if(lobbyTicks[name].untilStart<=0){
    lobbyTicks[name].started = true;
    if(rooms[name]?.startingPlayers){
    lobbyTicks[name].startingPlayers = {...rooms[name].startingPlayers};
    }
   // console.log(lobbyTicks[name].startingPlayers)
  }
  if(lobbyTicks[name].started){
    lobbyTicks[name].gameTime+=100;
    if(lobbyTicks[name].gameTime%10000==0&&lobbyTicks[name].borderRadius>1000){
      lobbyTicks[name].borderRadius-=250;
    }
  }
  //socket.to(socket.roomName).emit("gameTick",lobbyTicks[name]);
  }
  for(let id in lobbyTicks){
    if(!Object.keys(rooms).includes(id)){
      console.log("Deleting Lobby Ticker:", id);
      clearInterval(lobbyTicks[id]?.interval);
      delete lobbyTicks[id];
      console.log("Removed Lobby Ticker", id);
    }
  }
}

io.on("connection", (socket) => {
 console.log("Player connected:", socket.id);


 // Send current room list
 socket.emit("rooms_list", rooms);


 // ------------------------------
 // PLAYER CREATES A ROOM
 // ------------------------------
 socket.on("create_room", (roomData) => {
  roomData.name = roomData.name+"";
  let name = roomData.name;
  if(name!="NO ROOM"){
  lobbyTicks[name] = {code: name, interval: setInterval(intervalTick,100,name),started:false,untilStart: 10000,startingPlayers: {},borderRadius: 5000,gameTime: 0,untilAuto: 0};
  }
  //console.log(typeof name === "string" ,name.length > 0 ,name !== "__proto__" ,name !== "constructor",);
   if (!isValidRoomName(roomData.name)) return;
  // console.log("hi");
   if (!rooms[roomData.name]) {
     rooms[roomData.name] = { players: {}, blocks: {},type: roomData?.type ?? "custom",started: false, startingPlayers: {},worldBorder: 5000,};
     console.log(`Room created: ${roomData.name}`);
   }


   joinRoom(socket, roomData.name);
 });


 // ------------------------------
 // PLAYER JOINS A ROOM
 // ------------------------------
 socket.on("join_room", (roomName) => {
   if (!isValidRoomName(roomName)) return;
   if (!rooms[roomName]) return; // room must exist


   joinRoom(socket, roomName);
 });

 socket.on("fetchTick", (data) => {
   let roomName = socket.roomName;
   if (!roomName) return;
   let room = rooms[roomName];
   if (!room) return;
   let givenTickData = {...lobbyTicks[roomName]};
   delete givenTickData.interval;
   //console.log(`Sent to: ${roomName} for ${socket.id}`)
     socket.emit("tickData", {
       id: socket.id,
       tickData: givenTickData,
       roomData: room
     });
     //console.log(`Sent!`)
     //console.log(`-~-~-~-~-~-~-~-~-~`)
 });
 // ------------------------------
 // PLAYER UPDATES MOVEMENT
 // ------------------------------
 socket.on("updateCursor", (data) => {
   let roomName = socket.roomName;
   if (!roomName) return;


   let room = rooms[roomName];
   if (!room) return;


   if (room.players[socket.id]) {
     socket.to(roomName).emit("update", {
       id: socket.id,
       cursorData: { ...data },
     });
   }
 });
 socket.on("updateBlocks", (data) => {
   let roomName = socket.roomName;
   if (!roomName) return;


   let room = rooms[roomName];
   if (!room) return;


   if (room.players[socket.id]) {
     socket.to(roomName).emit("updateBl", {
       id: socket.id,
       blockData: { ...data },
     });
   }
 });
 socket.on("updateChat", (data) => {
   let roomName = socket.roomName;
   if (!roomName) return;


   let room = rooms[roomName];
   if (!room) return;


   if (room.players[socket.id]) {
     socket.to(roomName).emit("updateCh", {
       id: socket.id,
       chatData: { ...data },
     });
   }
 });
 socket.on("updateDamage", (data) => {
   let roomName = socket.roomName;
   if (!roomName) return;


   let room = rooms[roomName];
   if (!room) return;


   if (room.players[socket.id]) {
     socket.to(roomName).emit("updateD", {
       id: socket.id,
       damageData: { ...data },
     });
   }
 });
 socket.on("removeBullet", (data) => {
   let roomName = socket.roomName;
   if (!roomName) return;


   let room = rooms[roomName];
   if (!room) return;


   if (room.players[socket.id]) {
     socket.to(roomName).emit("updateRb", {
       id: socket.id,
       bulletData: { ...data },
     });
   }
 });
 socket.on("updateBullet", (data) => {
   let roomName = socket.roomName;
   if (!roomName) return;


   let room = rooms[roomName];
   if (!room) return;
   if (room.players[socket.id]) {
     socket.to(roomName).emit("updateB", {
       id: socket.id,
       bulletData: { ...data },
     });
   }
 });
 socket.on("updateData", (data) => {
   let roomName = socket.roomName;
   if (!roomName) return;


   let room = rooms[roomName];
   if (!room) return;


   if (room.players[socket.id]) {
     room.players[socket.id] = { ...data };
     socket.to(roomName).emit("updateP", {
       id: socket.id,
       playerData: { ...data },
     });
   }
 });
 socket.on("getRooms", (data) => {
  //console.log(socket.roomName,rooms,Object.keys(rooms));
     socket.emit("gotRooms", {
       id: socket.id,
       roomData: {...rooms},
     });
 });


 // ------------------------------
 // DISCONNECT HANDLING
 // ------------------------------
 socket.on("disconnect", () => {
   console.log(`Player disconnected: ${socket.id}`);


   let roomName = socket.roomName;
   if (!roomName || !rooms[roomName]) return;


   // Remove from room
   delete rooms[roomName].players[socket.id];
   socket.to(roomName).emit("removePlayer", socket.id);


   // Delete room if empty
   if (Object.keys(rooms[roomName].players).length === 0) {
     delete rooms[roomName];
     console.log(`Room deleted: ${roomName}`);
   }


   // Update rooms list for lobby clients
   io.emit("rooms_list", rooms);
 });
});


// ==================================================
// HELPER: Handle joining + initial state
// ==================================================
function joinRoom(socket, roomName) {
 // If the socket was in another room, remove it cleanly first
 //idk if this is nescesary:
 if (socket.roomName && socket.roomName !== roomName) {
   const prev = socket.roomName;
   try {
     socket.leave(prev);
   } catch (e) {}


   if (rooms[prev] && rooms[prev].players && rooms[prev].players[socket.id]) {
     delete rooms[prev].players[socket.id];
     socket.to(prev).emit("removePlayer", socket.id);


     if (Object.keys(rooms[prev].players).length === 0) {
       delete rooms[prev];
       console.log(`Room deleted: ${prev}`);
     }
    
     io.emit("rooms_list", rooms);
   }
 }


 //good after here
 socket.join(roomName);
 socket.roomName = roomName;


 // Create new player inside this specific room
 let addedData = {
   x: 0,
   y: 0,
   cRoom: roomName,
 };
 if(!rooms[roomName].started){
 rooms[roomName].players[socket.id] = addedData;
}
rooms[roomName].startingPlayers[socket.id] = addedData;

 // Send existing players in this room to the newcomer
 socket.emit("initialState", rooms[roomName].players);


 // Tell others in this room about the newcomer
 socket.to(roomName).emit("newPlayer", {
   id: socket.id,
   x: 0,
   y: 0,
   cRoom: roomName,
 });


 // Update rooms list for lobby
 io.emit("rooms_list", rooms);


 console.log(`Player ${socket.id} joined room ${roomName}`);
}


http.listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});



