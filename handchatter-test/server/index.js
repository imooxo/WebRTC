const express = require("express");
const http = require("http");
const app = express();
const cors = require("cors");
const server = http.createServer(app);
const socketio = require("socket.io");
const io = socketio.listen(server);

app.use(cors());
const PORT = process.env.PORT || 8080;

const users = {};

const socketToRoom = {};

const maximum = 2;



io.on("connection", (socket) => {
  socket.on("join_room", (data) => {
     // user[room]에는 room에 있는 사용자들이 배열 형태로 저장된다.
     // room이 존재한다면
    if (users[data.room]) {
      const length = users[data.room].length;
      // 최대 인원을 충족시켰으면 더 이상 접속 불가
      if (length === maximum) {
        socket.to(socket.id).emit("room_full");
        return;
      }
      // 인원이 최대 인원보다 적으면 접속 가능
      users[data.room].push({ id: socket.id });
    } else { // room이 존재하지 않는다면 새로 생성
      users[data.room] = [{ id: socket.id }];
    }
    // 해당 소켓이 어느 room에 속해있는 지 알기 위해 저장
    socketToRoom[socket.id] = data.room;

    socket.join(data.room);
    console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

    // 본인을 제외한 같은 room의 user array
    const usersInThisRoom = users[data.room].filter(
      (user) => user.id !== socket.id
    );

    console.log(usersInThisRoom);

    // 본인에게 해당 user array를 전송
    // 새로 접속하는 user가 이미 방에 있는 user들에게 offer(signal)를 보내기 위해
    io.sockets.to(socket.id).emit("all_users", usersInThisRoom);
  });

  // 다른 user들에게 offer를 보냄 (자신의 RTCSessionDescription)
  socket.on("offer", (sdp) => {
    console.log("offer: " + socket.id);
    // room에는 두 명 밖에 없으므로 broadcast 사용해서 전달
    socket.broadcast.emit("getOffer", sdp);
  });

   // offer를 보낸 user에게 answer을 보냄 (자신의 RTCSessionDescription)
  socket.on("answer", (sdp) => {
    console.log("answer: " + socket.id);
    // room에는 두 명 밖에 없으므로 broadcast 사용해서 전달
    socket.broadcast.emit("getAnswer", sdp);
  });

   // 자신의 ICECandidate 정보를 signal(offer 또는 answer)을 주고 받은 상대에게 전달
  socket.on("candidate", (candidate) => {
    console.log("candidate: " + socket.id);
    // room에는 두 명 밖에 없으므로 broadcast 사용해서 전달
    socket.broadcast.emit("getCandidate", candidate);
  });

  // user가 연결이 끊겼을 때 처리
  socket.on("disconnect", () => {
    console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
    // disconnect한 user가 포함된 roomID
    const roomID = socketToRoom[socket.id];
    // room에 포함된 유저
    let room = users[roomID];
    // room이 존재한다면(user들이 포함된)
    if (room) {
      room = room.filter((user) => user.id !== socket.id);
      users[roomID] = room;
      if (room.length === 0) {
        delete users[roomID];
        return;
      }
    }
    // 어떤 user가 나갔는 지 room의 다른 user에게 통보
    socket.broadcast.to(room).emit("user_exit", { id: socket.id });
    console.log(users);
  });
});

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});