const fs = require('fs');
const turnConfig = fs.readFileSync('turnserver.conf', 'utf8');
const wrtc = require('wrtc');
const peer = new wrtc.RTCPeerConnection({
  iceServers: [
    {
      urls: 'turn:example.com:3478?transport=udp',
      username: 'ID',
      credential: 'PASSWORD'
    }
  ]
});