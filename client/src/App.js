import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";

const Container = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  width: 100%;
`;

const Video = styled.video`
  border: 1px solid blue;
  width: 50%;
  height: 80%;
`;

function App() {
  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();

  useEffect(() => {
    socket.current = io.connect("http://localhost:4442/");
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      console.log(stream, 'stream')
      setStream(stream);
      console.log(userVideo.current, 'userVideo.current')

      if (userVideo.current) {
        console.log(stream, 'stream')
        console.log(userVideo.current.srcObject, 'userVideo.current.srcObject')
        userVideo.current.srcObject = stream;
      }
    })

    socket.current.on("yourID", (id) => {
      console.log(id, 'id')
      setYourID(id);
    })
    socket.current.on("allUsers", (users) => {
      console.log(users, 'users')
      setUsers(users);
    })

    socket.current.on("hey", (data) => {
      console.log(data.form, 'data.from', data.signal, 'data.signal')
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    })
  }, []);

  function callPeer(id) {
    console.log(id, 'id')
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          {
            urls: "stun:numb.viagenie.ca",
            username: "sultan1640@gmail.com",
            credential: "98376683"
          },
          {
            urls: "turn:numb.viagenie.ca",
            username: "sultan1640@gmail.com",
            credential: "98376683"
          }
        ]
      },
      stream: stream,
    });

    peer.on("signal", data => {
      console.log(id, 'id', data, 'data', yourID, 'yourId')
      socket.current.emit("callUser", { userToCall: id, signalData: data, from: yourID })
    })

    //use to see two videos.1.ours 2.other person
    peer.on("stream", stream => {
      console.log(partnerVideo.current, 'partnerVideo.current')
      if (partnerVideo.current) {
        console.log(stream)
        partnerVideo.current.srcObject = stream;
      }
    });

    //return signal beacuse both the peer sends signal to each other to communicate each other
    socket.current.on("callAccepted", signal => {
      setCallAccepted(true);
      console.log(signal, 'signal')
      peer.signal(signal);
    })

  }

  function acceptCall() {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", data => {
      socket.current.emit("acceptCall", { signal: data, to: caller })
    })

    peer.on("stream", stream => {
      partnerVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
  }

  function VolumeSetting() {
    var vid = document.getElementById("localVideo");
    vid.volume = 0.0;

  }

  let UserVideo;
  console.log(stream, 'stream')
  if (stream) {
    UserVideo = (
      //style component
      <Video id="localVideo" playsInline ref={userVideo} autoPlay onPlayCapture={VolumeSetting} />
    );
  }

  let PartnerVideo;
  console.log(callAccepted, 'callAccepted')
  if (callAccepted) {
    PartnerVideo = (
      <Video id="localVideo" playsInline ref={partnerVideo} autoPlay onPlayCapture={VolumeSetting} />
    );
  }

  let incomingCall;
  console.log(receivingCall, 'receivingCall')
  if (receivingCall) {
    incomingCall = (
      !callAccepted ?
        <div style={{ display: 'inline-grid' }}>
          < h1 > Client is calling you</h1 >
          <button className="accept" onClick={acceptCall}>Accept</button>
        </div >
        :
        <div style={{ display: 'inline-grid' }}>
          < h1 >Connected</h1 >
          <button className="hangup" onClick={acceptCall}>HangUp</button>
        </div >
    )
  }

  return (
    <Container>
      <Row style={{ justifyContent: 'center' }}>
        {UserVideo}
        {PartnerVideo}
      </Row>
      {
        !callAccepted &&
        <Row style={{ justifyContent: 'center' }}>
          {Object.keys(users).map(key => {
            console.log(yourID, 'yourID')
            console.log(key, 'key')
            if (key === yourID) {
              return null;
            }
            return (
              <button className="call-user" onClick={() => callPeer(key)}>Call User</button>
            );
          })}
        </Row>
      }

      <Row style={{ justifyContent: 'center' }}>
        {incomingCall}
      </Row>
    </Container>
  );
}

export default App;
