const socketIO = require("socket.io");
const Message = require("./models/Message");
const { generateHeartbeat } = require("./utils/ecgGenerator");

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*", // Adjust in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Join a specific chat room
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`🏠 User joined room: ${roomId}`);
    });

    // Handle ECG Streaming (Simulation)
    socket.on("start_ecg_stream", (patientId) => {
      console.log(`📡 Starting ECG Stream for patient: ${patientId}`);
      
      const sampleRate = 250;
      let heartbeat = generateHeartbeat(sampleRate, 72); // 72 bpm
      let pointIndex = 0;

      // Envoyer des paquets de 25 points (~100ms de données)
      const streamInterval = setInterval(() => {
        if (!socket.connected) {
          clearInterval(streamInterval);
          return;
        }

        const chunk = [];
        for (let i = 0; i < 25; i++) {
          chunk.push(heartbeat[pointIndex]);
          pointIndex = (pointIndex + 1) % heartbeat.length;
        }

        socket.emit("ecg_data", {
          patientId,
          data: chunk,
          timestamp: new Date().getTime(),
          // Simulation d'annotations IA (un pic R toutes les secondes environ)
          annotations: Math.random() > 0.9 ? [{ type: 'peak', label: 'R', index: chunk.length - 1 }] : []
        });
      }, 100);

      socket.on("stop_ecg_stream", () => {
        clearInterval(streamInterval);
        console.log(`🛑 Stopped ECG Stream for patient: ${patientId}`);
      });

      socket.on("disconnect", () => {
        clearInterval(streamInterval);
      });
    });

    // Handle sending message
    socket.on("send_message", async (data) => {
      try {
        const { expediteur, destinataire, patient, contenu, roomId } = data;
        const newMessage = await Message.create({ expediteur, destinataire, patient, contenu });
        io.to(roomId).emit("receive_message", newMessage);
      } catch (err) {
        console.error("❌ Socket Error sending message:", err.message);
      }
    });

    // ─── WebRTC Signaling for Teleconsultation ───────────────────────────────
    
    // User requests a call
    socket.on("call:request", (data) => {
      console.log(`📞 Call Request from ${data.from} for room: ${data.roomId}`);
      socket.to(data.roomId).emit("call:invite", {
        from: data.from,
        signalData: data.signalData, // Offer
        fromName: data.fromName
      });
    });

    // User responds to a call
    socket.on("call:response", (data) => {
      console.log(`✅ Call Response from room: ${data.roomId} (Accepted: ${data.accepted})`);
      socket.to(data.roomId).emit("call:answered", {
        accepted: data.accepted,
        signalData: data.signalData // Answer
      });
    });

    // Exchange ICE candidates
    socket.on("call:ice-candidate", (data) => {
      socket.to(data.roomId).emit("call:ice-candidate", data.candidate);
    });

    // End call
    socket.on("call:end", (data) => {
      console.log(`🏁 Call ended in room: ${data.roomId}`);
      io.to(data.roomId).emit("call:terminated");
    });

    socket.on("disconnect", () => {
      console.log("📡 User disconnected");
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

module.exports = { initSocket, getIO };
