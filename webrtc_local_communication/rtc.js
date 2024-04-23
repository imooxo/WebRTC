"use strict";

// jsdom 라이브러리를 사용하면 Node.js 환경에서 DOM 객체를 시뮬레이션할 수 있다.
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.document = dom.window.document;

// 수정: JSDOM의 window 객체를 사용하여 버튼을 찾음
let dataChannelSend = document.getElementById("dataChannelSend");
let dataChannelReceive = document.getElementById("dataChannelReceive");
let sendBtn = dom.window.document.createElement('button'); // 버튼 요소 생성
sendBtn.id = 'send'; // 버튼의 id 설정
sendBtn.textContent = 'Send'; // 버튼의 텍스트 설정
dom.window.document.body.appendChild(sendBtn); // body에 버튼 추가

let pcConstraint;
let dataConstraint;
let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;

// 이벤트 핸들러 등록
sendBtn.onclick = sendData;

createConnection();

function createConnection() {
  let servers = null;
  pcConstraint = null;
  dataConstraint = null;

  dom.window.localConnection = localConnection = new RTCPeerConnection(
    servers,
    pcConstraint
  );

  sendChannel = localConnection.createDataChannel(
    "sendDataChannel",
    dataConstraint
  );

  localConnection.onicecandidate = iceCallback1;
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;

  dom.window.remoteConnection = remoteConnection = new RTCPeerConnection(servers, pcConstraint);

  remoteConnection.onicecandidate = iceCallback2;
  remoteConnection.ondatachannel = receiveChannelCallback;

  localConnection.createOffer().then(
    gotDescription1,
    onCreateSessionDescriptionError
  );
}

function iceCallback1(event) {
  console.log('local ice callback');
  if (event.candidate) {
    remoteConnection
      .addIceCandidate(event.candidate)
      .then(onAddIceCandidateSuccess, onAddIceCandidateError);
  }
}

function iceCallback2(event) {
  if (event.candidate) {
    localConnection
      .addIceCandidate(event.candidate)
      .then(onAddIceCandidateSuccess, onAddIceCandidateError);
  }
}

function onAddIceCandidateSuccess() {
  console.log("AddIce Success");
}

function onAddIceCandidateError(error) {
  console.error("AddIce error" + error.toString());
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  if (readyState === "open") {
    console.log('opened');
  } else {
    console.log('closed');
  }
}

function receiveChannelCallback(event) {
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveMessageCallback;
}

function onReceiveMessageCallback(event) {
  dataChannelReceive.value = event.data;
}

function gotDescription1(desc) {
  console.log(desc);
  localConnection.setLocalDescription(desc);
  remoteConnection.setRemoteDescription(desc);
  remoteConnection.createAnswer().then(
    gotDescription2,
    onCreateSessionDescriptionError
  );
}

function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  localConnection.setRemoteDescription(desc);
}

function sendData() {
  let data = dataChannelSend.value;
  console.log('btn Data : ', data);
  sendChannel.send(data);
}

function onCreateSessionDescriptionError(error) {
  console.error('Failed to create session description: ' + error.toString());
}