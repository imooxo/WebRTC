"use strict";

// HTML에서 id가 'localVideo'와 'remoteVideo'인 요소를 가져옴
let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

// 피어 연결 및 상태를 나타내는 변수들을 초기화
let isInitiator = false;
let isChannelReady = false;
let isStarted = false;
let localStream;
let remoteStream;
let pc;

// ICE 서버 구성을 설정
// 구글에서 무료로 배포한 stun 서버
let pcConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
}

let room = 'foo';

let socket = io.connect();

// 방 이름이 비어있지 않은 경우, 방을 생성하거나 참가
if (room !== '') {
    socket.emit('create or join', room);
    console.log('Attempted to create or join Room', room);
}

// 'created' 이벤트를 수신하면 해당 방을 생성한 것으로 설정
socket.on('created', (room, id) => {
    console.log('Created room ' + room + ' socket ID : ' + id);
    isInitiator = true;
})

// 'full' 이벤트를 수신하면 해당 방이 가득 찼음을 알림
socket.on('full', room => {
    console.log('Room ' + room + ' is full');
});

// 'join' 이벤트를 수신하면 다른 피어가 방에 참가하려는 것임을 알림
socket.on('join', room => {
    console.log('Another peer made a request to join room ' + room);
    console.log('This peer is the initiator of room ' + room + '!');
    isChannelReady = true;
})

// 'joined' 이벤트를 수신하면 해당 방에 성공적으로 참가했음을 알림
socket.on('joined', room => {
    console.log('joined : ' + room);
    isChannelReady = true;
})

// 'log' 이벤트를 수신하면 해당 이벤트를 콘솔에 출력
socket.on('log', array => {
    console.log.apply(console, array);
});

// 'message' 이벤트를 수신하면 해당 메시지를 처리
socket.on('message', (message) => {
    console.log('Client received message :', message);
    if (message === 'got user media') {
        maybeStart();
    } else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if (message.type === 'answer' && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
        const candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });

        pc.addIceCandidate(candidate);
    }
})

// 메시지를 전송하는 함수를 정의
function sendMessage(message) {
    console.log('Client sending message: ', message);
    socket.emit('message', message);
}

// 미디어 스트림을 가져오는 함수를 정의
navigator.mediaDevices
    .getUserMedia({
        video: true,
        audio: false,
    })
    .then(gotStream)
    .catch((error) => console.error(error));

// 미디어 스트림을 가져왔을 때의 처리를 정의
function gotStream(stream) {
    console.log("Adding local stream");
    localStream = stream;
    localVideo.srcObject = stream;
    sendMessage("got user media");
    if (isInitiator) {
        maybeStart();
    }
}

// 피어 연결을 생성하는 함수를 정의
function createPeerConnection() {
    try {
        pc = new RTCPeerConnection(null);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        console.log("Created RTCPeerConnection");
    } catch (e) {
        alert("connot create RTCPeerConnection object");
        return;
    }
}

// ICE candidate 이벤트를 처리하는 함수를 정의
function handleIceCandidate(event) {
    console.log("iceCandidateEvent", event);
    if (event.candidate) {
        sendMessage({
            type: "candidate",
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
        });
    } else {
        console.log("end of candidates");
    }
}

// Offer 생성 오류를 처리하는 함수를 정의
function handleCreateOfferError(event) {
    console.log("createOffer() error: ", event);
}

// 원격 스트림이 추가될 때의 처리를 정의
function handleRemoteStreamAdded(event) {
    console.log("remote stream added");
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

// 통화를 시작하는 함수를 정의
function maybeStart() {
    console.log(">>MaybeStart() : ", isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== "undefined" && isChannelReady) {
        console.log(">>>>> creating peer connection");
        createPeerConnection();
        pc.addStream(localStream);
        isStarted = true;
        console.log("isInitiator : ", isInitiator);
        if (isInitiator) {
            doCall();
        }
    } else {
        console.error('maybeStart not Started!');
    }
}

// Offer를 생성하는 함수를 정의
function doCall() {
    console.log("Sending offer to peer");
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

// Answer를 생성하는 함수를 정의
function doAnswer() {
    console.log("Sending answer to peer");
    pc.createAnswer().then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
    );
}

// 로컬 세션을 설정하고 메시지를 전송하는 함수를 정의
function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    sendMessage(sessionDescription);
}

// 세션 설명 생성 오류를 처리하는 함수를 정의
function onCreateSessionDescriptionError(error) {
    console.error("Falied to create session Description", error);
}