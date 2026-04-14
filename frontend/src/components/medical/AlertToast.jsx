import { useState, useEffect, useCallback } from "react";
import { getSocket } from "../../utils/socket";
import "./AlertToast.css";

// ─── Composant d'une notification individuelle ──────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 350);
    }, toast.duration || 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 350);
  };

  const config = {
    Critique: {
      icon: "🔴",
      label: "CRITIQUE",
      color: "#eb5757",
      bg: "#fff0f0",
      border: "#eb5757",
    },
    A_surveiller: {
      icon: "🟠",
      label: "SURVEILLANCE",
      color: "#f2994a",
      bg: "#fff8f0",
      border: "#f2994a",
    },
    Normal: {
      icon: "🟢",
      label: "NORMAL",
      color: "#27ae60",
      bg: "#f0faf4",
      border: "#27ae60",
    },
  }[toast.priorite] || {
    icon: "🔔",
    label: "INFO",
    color: "#2f80ed",
    bg: "#f0f7ff",
    border: "#2f80ed",
  };

  return (
    <div
      className={`alert-toast alert-toast--${exiting ? "exit" : "enter"}`}
      style={{ borderLeftColor: config.border, background: config.bg }}
    >
      <div className="alert-toast__icon">{config.icon}</div>
      <div className="alert-toast__body">
        <div className="alert-toast__header">
          <span
            className="alert-toast__badge"
            style={{ color: config.color, background: config.color + "22" }}
          >
            {config.label}
          </span>
          <span className="alert-toast__time">maintenant</span>
        </div>
        <p className="alert-toast__patient">{toast.patientNom}</p>
        <p className="alert-toast__detail">{toast.detail}</p>
      </div>
      <button className="alert-toast__close" onClick={handleDismiss}>
        ✕
      </button>
    </div>
  );
}

// ─── Conteneur principal des toasts ─────────────────────────────────────────
export function AlertToastContainer() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on("new_alert", (alert) => {
      // N'afficher le toast que pour les alertes critiques ou à surveiller
      if (alert.priorite === "Normal") return;

      const toast = {
        id: Date.now() + Math.random(),
        priorite: alert.priorite,
        patientNom: alert.patientNom || "Patient",
        detail: alert.detail,
        duration: alert.priorite === "Critique" ? 10000 : 6000,
      };

      setToasts((prev) => [toast, ...prev].slice(0, 5)); // Max 5 toasts simultanés

      // Notification navigateur si critique
      if (alert.priorite === "Critique" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(`🔴 Alerte Critique — ${alert.patientNom}`, {
            body: alert.detail,
            icon: "/favicon.ico",
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    });

    return () => socket.off("new_alert");
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="alert-toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

export default AlertToastContainer;
