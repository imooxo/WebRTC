const http = require('http');
//const os = require('os');
const socketIO = require('socket.io');
const nodeStatic = require('node-static');
// jsdom 라이브러리를 사용하면 Node.js 환경에서 DOM 객체를 시뮬레이션할 수 있다.
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.document = dom.window.document;

let fileServer = new(nodeStatic.Server)();
let app = http.createServer((req,res)=>{
    fileServer.serve(req,res);
}).listen(8080);

let io = socketIO.listen(app);

/*
    signaling 서버에 대한 구현으로 room이 없다면 생성하고, 
    room이 이미 존재한다면 room에 참가하여 내 뷰를 상대방에게 중개하는 역할임
*/
io.sockets.on('connection',socket=>{
    function log() {
        let array = ['Message from server:'];
        array.push.apply(array,arguments);
        socket.emit('log',array);
    }

    socket.on('message',message=>{
        log('Client said : ' ,message);
        socket.broadcast.emit('message',message);
    });

    socket.on('create or join',room=>{
        let clientsInRoom = io.sockets.adapter.rooms[room];
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        log('Room ' + room + ' now has ' + numClients + ' client(s)');
        
        if(numClients === 0){
            console.log('create room!');
            socket.join(room);
            log('Client ID ' + socket.id + ' created room ' + room);
            socket.emit('created',room,socket.id);
        }
        else if(numClients===1){
            console.log('join room!');
            log('Client Id' + socket.id + 'joined room' + room);
            io.sockets.in(room).emit('join',room);
            socket.join(room);
            socket.emit('joined',room,socket.id);
            io.sockets.in(room).emit('ready');
        }else{
            socket.emit('full',room);
        }
    });


});