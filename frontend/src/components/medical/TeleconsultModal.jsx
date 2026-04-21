import React, { useState, useEffect, useRef } from "react";
import { getSocket } from "../../utils/socket";
import "./TeleconsultModal.css";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function TeleconsultModal({ isOpen, onClose, patientName, roomId, currentUser }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [status, setStatus] = useState("initializing"); // initializing | calling | connected
  const [initTimeout, setInitTimeout] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSimulatingPatient, setIsSimulatingPatient] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const socket = getSocket();

  useEffect(() => {
    let timer;
    if (isOpen) {
      enumerateDevices();
      startCall();
      timer = setTimeout(() => {
        setInitTimeout(true);
      }, 8000); // 8 seconds timeout
    } else {
      cleanup();
    }
    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, [isOpen]);

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Erreur énumération périphériques:", err);
    }
  };

  const startCall = async (deviceId = null) => {
    try {
      setStatus("initializing");
      // 1. Get Local Media
      const constraints = {
        audio: true,
        video: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      
      // Stop old tracks if switching camera
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Initialize Audio Analysis
      initAudioAnalysis(stream);

      // 2. Create Peer Connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        setStatus("connected");
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            roomId,
            candidate: event.candidate,
          });
        }
      };

      // 3. Create Offer (since Doctor is the initiator)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call:request", {
        roomId,
        from: currentUser.id,
        fromName: currentUser.name,
        signalData: offer,
      });

      setStatus("calling");

      // 4. Setup Signaling Listeners
      socket.on("call:answered", async (data) => {
        if (data.accepted && data.signalData) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.signalData));
        } else {
          alert("Le patient a refusé l'appel ou est occupé.");
          onClose();
        }
      });

      socket.on("call:ice-candidate", async (candidate) => {
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding ice candidate", e);
          }
        }
      });

      socket.on("call:terminated", () => {
        onClose();
      });

    } catch (err) {
      console.error("Erreur téléconsultation:", err);
      let errorMsg = "Impossible d'accéder à la caméra ou au microphone.";
      if (err.name === 'NotAllowedError') errorMsg = "L'accès à la caméra a été refusé par le navigateur.";
      if (err.name === 'NotFoundError') errorMsg = "Aucune caméra n'a été détectée sur votre appareil.";
      if (err.name === 'NotReadableError') errorMsg = "La caméra est déjà utilisée par une autre application.";
      
      alert(errorMsg);
      onClose();
    }
  };

  const initAudioAnalysis = (stream) => {
    try {
      if (audioContextRef.current) audioContextRef.current.close();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setAudioLevel(average * 1.5); // Boost for visibility
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.error("Audio analysis failed", e);
    }
  };

  const simulatePatientConnection = () => {
    setIsSimulatingPatient(true);
    // Use local stream as mock remote stream if available, else just state change
    if (localStream) {
      setRemoteStream(localStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = localStream;
    }
    setStatus("connected");
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    socket.off("call:answered");
    socket.off("call:ice-candidate");
    socket.off("call:terminated");
    setLocalStream(null);
    setRemoteStream(null);
    setStatus("initializing");
    setAudioLevel(0);
  };

  const handleEndCall = () => {
    socket.emit("call:end", { roomId });
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tcons-overlay">
      <div className="tcons-container">
        {/* Main Video View (Remote) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          className="tcons-remote-video"
          poster="/patient-placeholder.jpg"
        />

        {/* Local Video View (Doctor) */}
        <div className="tcons-local-video-wrap">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className="tcons-local-video"
          />
        </div>

        {/* Status Overlay if not connected */}
        {status !== "connected" && !isDemoMode && (
          <div className="tcons-loading-overlay">
            {initTimeout ? (
              <div className="tcons-error-state">
                <span className="tcons-error-icon">⚠️</span>
                <p>La caméra ne semble pas répondre.</p>
                <div className="tcons-error-actions">
                  <button onClick={() => startCall()} className="tcons-retry-btn">Réessayer</button>
                  <button onClick={() => {
                    setIsDemoMode(true);
                    simulatePatientConnection();
                  }} className="tcons-demo-btn">Mode Démo (Simuler Patient)</button>
                </div>
              </div>
            ) : (
              <>
                <div className="tcons-spinner"></div>
                <p>{status === "initializing" ? "Initialisation caméra..." : `Appel de ${patientName}...`}</p>
              </>
            )}
          </div>
        )}

        {/* Demo Mode Visuals */}
        {(isDemoMode || isSimulatingPatient) && (
          <div className="tcons-demo-notice">
            Consultation Simulée (Démo)
          </div>
        )}

        {/* Info Overlay */}
        <div className="tcons-info">
          <h3 className="tcons-patient-name">{patientName}</h3>
          <div className="tcons-status">
            {status === "connected" ? "En consultation" : "Tentative de connexion..."}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="tcons-controls">
          <div className="tcons-audio-meter-wrap">
            <div 
              className="tcons-audio-bar" 
              style={{ 
                height: `${Math.min(audioLevel * 1.5, 100)}%`,
                background: isMuted ? '#666' : 'linear-gradient(to top, #10b981, #34d399)'
              }}
            ></div>
          </div>

          <button 
            className={`tcons-btn tcons-btn--mute ${isMuted ? "active" : ""}`}
            onClick={toggleMute}
            title={isMuted ? "Activer le micro" : "Couper le micro"}
          >
            {isMuted ? "🎙️❌" : "🎙️"}
          </button>
          
          <button 
            className={`tcons-btn tcons-btn--video ${isVideoOff ? "active" : ""}`}
            onClick={toggleVideo}
            title={isVideoOff ? "Activer la caméra" : "Masquer la caméra"}
          >
            {isVideoOff ? "📷❌" : "📷"}
          </button>

          <button 
            className="tcons-btn tcons-btn--end"
            onClick={handleEndCall}
            title="Terminer l'appel"
          >
            📞
          </button>

          {availableCameras.length > 1 && (
            <div className="tcons-device-selector-wrap">
              <button 
                className="tcons-btn tcons-btn--settings"
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                title="Changer de caméra"
              >
                ⚙️
              </button>
              {showDeviceSettings && (
                <div className="tcons-device-dropdown">
                  {availableCameras.map(cam => (
                    <div 
                      key={cam.deviceId} 
                      className={`tcons-device-item ${selectedCamera === cam.deviceId ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCamera(cam.deviceId);
                        startCall(cam.deviceId);
                        setShowDeviceSettings(false);
                      }}
                    >
                      {cam.label || `Caméra ${cam.deviceId.substring(0, 5)}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeleconsultModal;
