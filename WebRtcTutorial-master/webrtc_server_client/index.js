// HTTP 서버 모듈, 운영 체제 관련 모듈, 웹 소켓 모듈, 정적 파일 서빙 모듈을 불러옴
const http = require('http');
const os = require('os');
const socketIO = require('socket.io');
const nodeStatic = require('node-static');

// 정적 파일 서빙을 위한 파일 서버 객체를 생성
let fileServer = new(nodeStatic.Server)();

// HTTP 서버를 생성하고 8080 포트에서 대기하도록 설정
// 요청이 들어오면 fileServer.server(req, res)를 통해 정적 파일을 서빙
let app = http.createServer((req, res) => {
    fileServer.serve(req, res);
}).listen(8080);

// Socket.IO를 HTTP 서버에 연결
let io = socketIO.listen(app);

// 클라이언트와의 소켓 연결이 이루어졌을 때의 이벤트 핸들러를 정의
io.sockets.on('connection', socket => {
    // 서버 측에서 클라이언트로 메시지를 보내는 함수를 정의
    function log() {
        let array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    // 클라이언트로부터 'message' 이벤트를 받았을 때의 이벤트 핸들러를 정의
    // 클라이언트가 보낸 메시지를 로깅하고, 다른 클라이언트에게 메시지를 전달
    socket.on('message', message => {
        log('Client said : ', message);
        socket.broadcast.emit('message', message);
    });

    // 'create or join' 이벤트를 받았을 때의 이벤트 핸들러를 정의
    socket.on('create or join', room => {
        // 해당 방에 있는 클라이언트 정보를 가져옴
        let clientsInRoom = io.sockets.adapter.rooms[room];
        // 해당 방에 있는 클라이언트 수를 계산
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        // 해당 방에 있는 클라이언트 수를 로깅
        log('Room ' + room + ' now has ' + numClients + ' client(s)');

        // 방에 클라이언트가 없는 경우 (numClients === 0)
        if (numClients === 0) {
            console.log('create room!');
            socket.join(room);
            // 클라이언트가 방을 생성했음을 로깅
            log('Client ID ' + socket.id + ' created room ' + room);
            // 클라이언트에게 'created' 이벤트를 전달
            socket.emit('created', room, socket.id);
        }
        // 방에 클라이언트가 1명인 경우 (numClients === 1)
        else if (numClients === 1) {
            console.log('join room!');
            // 클라이언트가 방에 참가했음을 로깅
            log('Client Id' + socket.id + 'joined room' + room);
            // 해당 방에 있는 모든 클라이언트에게 'join' 이벤트를 전달
            io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready');
        }
        // 방이 가득 찼을 경우 (numClients > 1)
        else {
            // 클라이언트에게 'full' 이벤트를 전달
            socket.emit('full', room);
        }
    });
});