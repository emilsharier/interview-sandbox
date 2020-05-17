import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import "./VideoChat.css";

const Container = styled.div`
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
  height: calc(15vh);
`;

const VideoChat = ({ sessionid }) => {
  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [session, setSession] = useState(sessionid);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();

  // console.log(sessionid, users, "sessionid & users in VideoChat");

  useEffect(() => {
    socket.current = io.connect(
      "https://fathomless-journey-95730.herokuapp.com/"
    );
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });

    socket.current.on("yourID", (id) => {
      setYourID(id);
    });
    socket.current.on("allUsers", (users, sessionid) => {
      setUsers(users, sessionid);
    });

    socket.current.on("hey", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });
  }, []);

  function callPeer(id, sessionid) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.current.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: yourID,
      });
    });

    peer.on("stream", (stream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    socket.current.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
  }

  function acceptCall() {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.current.emit("acceptCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      partnerVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
  }

  let UserVideo;
  if (stream) {
    UserVideo = <Video playsInline muted ref={userVideo} autoPlay />;
  }

  let PartnerVideo;
  if (callAccepted) {
    PartnerVideo = <Video playsInline ref={partnerVideo} autoPlay />;
  }

  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        {/* <p>{caller} is calling you</p> */}
        <button
          style={{ backgroundColor: "#fcee09", color: "#000" }}
          onClick={acceptCall}
          className="btn callButton"
        >
          <span className="btn__content">Accept Call</span>
        </button>
      </div>
    );
  }

  return (
    <Container className="videoContainer">
      <Row>
        {Object.keys(users).map((key) => {
          if (key === yourID) {
            return null;
          }
          return (
            <button className="btn callButton" onClick={() => callPeer(key)}>
              <span className="btn__content">Call</span>
            </button>
          );
        })}
        <div>{incomingCall}</div>
      </Row>
      <div>
        <Row>
          {UserVideo}
          {PartnerVideo}
        </Row>
      </div>
    </Container>
  );
};

export default VideoChat;
