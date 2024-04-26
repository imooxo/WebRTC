"use strict";

// HTML 요소를 참조하는 변수
let dataChannelSend = document.getElementById("dataChannelSend");
let dataChannelReceive = document.getElementById("dataChannelReceive");
let sendBtn = document.getElementById("send");

// 연결 및 데이터 채널 제약 조건을 나타내는 변수
let pcConstraint;
let dataConstraint;

// RTCPeerConnection 객체를 나타내는 변수
let localConnection;
let remoteConnection;

// 데이터 채널을 나타내는 변수
let sendChannel;
let receiveChannel;

// 전송 버튼 클릭 시 데이터 전송 함수 호출
sendBtn.onclick = sendData;

// 연결 생성 함수 호출
createConnection();

// 연결 생성 함수
function createConnection() {
  let servers = null;
  pcConstraint = null;
  dataConstraint = null;

  // 로컬 RTCPeerConnection 객체 생성
  window.localConnection = localConnection = new RTCPeerConnection(servers, pcConstraint);

  // 데이터 채널 생성
  sendChannel = localConnection.createDataChannel("sendDataChannel", dataConstraint);

  // ICE candidate 이벤트 및 데이터 채널 상태 변경 이벤트에 대한 콜백 함수 설정
  localConnection.onicecandidate = iceCallback1;
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;

  // 원격 RTCPeerConnection 객체 생성
  window.remoteConnection = remoteConnection = new RTCPeerConnection(servers, pcConstraint);

  // ICE candidate 이벤트 및 데이터 채널 수신 이벤트에 대한 콜백 함수 설정
  remoteConnection.onicecandidate = iceCallback2;
  remoteConnection.ondatachannel = receiveChannelCallback;

  // 로컬 RTCPeerConnection에서 Offer 생성
  localConnection.createOffer().then(gotDescription1, onCreateSessionDescriptionError);
}

// ICE candidate 처리 함수 (로컬)
function iceCallback1(event) {
  console.log('local ice callback');
  if (event.candidate) {
    // 상대방의 연결에 ICE candidate 추가
    remoteConnection.addIceCandidate(event.candidate).then(onAddIceCandidateSuccess, onAddIceCandidateError);
  }
}

// ICE candidate 처리 함수 (원격)
function iceCallback2(event) {
  if (event.candidate) {
    // 로컬 연결에 ICE candidate 추가
    localConnection.addIceCandidate(event.candidate).then(onAddIceCandidateSuccess, onAddIceCandidateError);
  }
}

// ICE candidate 추가 성공 시 호출되는 함수
function onAddIceCandidateSuccess() {
  console.log("AddIce Success");
}

// ICE candidate 추가 실패 시 호출되는 함수
function onAddIceCandidateError(error) {
  console.error("AddIce error" + error.toString());
}

// 데이터 채널 상태 변경 이벤트 처리 함수
function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  if (readyState === "open") {
    console.log('opened');
  } else {
    console.log('closed');
  }
}

// 데이터 채널 수신 이벤트 처리 함수
function receiveChannelCallback(event) {
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveMessageCallback;
}

// 데이터 수신 시 호출되는 함수
function onReceiveMessageCallback(event) {
  dataChannelReceive.value = event.data;
}

// 로컬 RTCPeerConnection에서 Offer 생성 완료 시 호출되는 함수
function gotDescription1(desc) {
  console.log(desc);
  localConnection.setLocalDescription(desc);
  remoteConnection.setRemoteDescription(desc);
  remoteConnection.createAnswer().then(gotDescription2, onCreateSessionDescriptionError);
}

// 원격 RTCPeerConnection에서 Answer 생성 완료 시 호출되는 함수
function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  localConnection.setRemoteDescription(desc);
}

// 데이터 전송 함수
function sendData() {
  let data = dataChannelSend.value;
  console.log('btn Data : ', data);
  sendChannel.send(data);
}

// 세션 설명 생성 실패 시 호출되는 함수
function onCreateSessionDescriptionError(error) {
  console.error('Failed to create session description: ' + error.toString());
}