import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Singleton — created once at module load, survives React StrictMode remounts
let socket = null;

const createSocket = () => {
  const s = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  s.on("connect", () => console.log("🔌 Socket connecté:", s.id));
  s.on("disconnect", (reason) => console.log("📡 Socket déconnecté:", reason));
  s.on("connect_error", (err) => console.warn("⚠️ Socket erreur:", err.message));

  return s;
};

// Initialize immediately (module-level singleton)
socket = createSocket();

export const getSocket = () => socket;

export const connectSocket = () => socket;

export const disconnectSocket = () => {
  // Do NOT disconnect — socket is shared across all components.
  // Call this only at app logout.
  if (socket?.connected) {
    socket.disconnect();
    console.log("📡 Socket déconnecté (logout)");
  }
};

