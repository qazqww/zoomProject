import http from "http";
// import WebSocket from 'ws';
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug")
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);
// app.listen(3000, handleListen);

// http서버 위에 ws서버를 만들어서 동일한 포트에서 http, wss 모두 처리
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: ["https://admin.socket.io"],
      credentials: true
    }
});

instrument(io, {
    auth: false,
    mode: "development",
});

function publicRooms() {
    const { sockets: { adapter: { sids, rooms } } } = io;
    // const sids = io.sockets.adapter.sids;
    // const rooms = io.sockets.adapter.rooms;
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    })
    return publicRooms;
}

function countRoom(roomName) {
    return io.sockets.adapter.rooms.get(roomName)?.size;
}

io.on("connection", (socket) => {
    socket["nickname"] = "Anonymous";
    socket.onAny((event) => {
        console.log(io.sockets.adapter);
        console.log(`Socket Event: ${event}`);
    });
    socket.on("enter_room", (nickname, roomName, done) => {
        socket["nickname"] = nickname;
        socket.join(roomName);
        // console.log(socket.rooms);
        const count = countRoom(roomName);
        done(count);
        socket.to(roomName).emit("welcome", socket.nickname, count);
        io.sockets.emit("room_change", publicRooms());
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1));
    });
    socket.on("disconnect", () => {
        io.sockets.emit("room_change", publicRooms());
    })
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    socket.on("nickname", (nickname) => socket["nickname"] = nickname);
});



// const wss = new WebSocket.Server({ server });

// const sockets = [];

// // wss는 서버를 위한 것, socket은 각 브라우저에 해당
// wss.on("connection", (socket) => {
//     sockets.push(socket);
//     socket["nickname"] = "Anonymous";
//     console.log("Connected to Browser ✅");
//     socket.on("close", () => console.log("Disconnected from Browser ❌"));
//     socket.on("message", (msg) => {
//         const message = JSON.parse(msg);
//         switch (message.type) {
//             case "new_message":
//                 sockets.forEach((aSocket) =>
//                     aSocket.send(`${socket.nickname}: ${message.payload}`)
//                 );
//                 break;
//             case "nickname":
//                 socket["nickname"] = message.payload;
//                 break;
//         }
//     });
// })

server.listen(3000, handleListen);