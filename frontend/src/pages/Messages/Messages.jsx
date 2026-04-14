import React, { useState, useEffect, useRef } from "react";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import { getSocket, connectSocket, disconnectSocket } from "../../utils/socket";
import "./Messages.css";

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const chatBodyRef = useRef(null);
  const socket = getSocket();

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Messages",
  }));

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // 1. Initial Load
  useEffect(() => {
    const token = localStorage.getItem("caredify_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUser(payload);
      } catch (e) {
        console.error("Token decode error", e);
      }
    }

    const fetchConversations = async () => {
      try {
        const response = await fetch(`${API_URL}/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) setConversations(data);
      } catch (err) {
        console.error("Fetch conversations error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    connectSocket();
    return () => disconnectSocket();
  }, []);

  // 2. Fetch History & Join Room
  useEffect(() => {
    if (!selectedPatient || !currentUser) return;

    const fetchHistory = async () => {
      const token = localStorage.getItem("caredify_token");
      try {
        const response = await fetch(
          `${API_URL}/messages/${selectedPatient._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await response.json();
        if (response.ok) setMessages(data);
      } catch (err) {
        console.error("Fetch history error", err);
      }
    };

    fetchHistory();

    const roomId = [currentUser.id, selectedPatient._id].sort().join("_");
    socket.emit("join_room", roomId);

    const handleReceiveMessage = (msg) => {
      if (msg.patient === selectedPatient._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("receive_message", handleReceiveMessage);
    return () => socket.off("receive_message", handleReceiveMessage);
  }, [selectedPatient, currentUser]);

  // 3. Scroll to bottom
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedPatient || !currentUser) return;

    const roomId = [currentUser.id, selectedPatient._id].sort().join("_");
    const messageData = {
      expediteur: currentUser.id,
      destinataire: selectedPatient.medecin || selectedPatient._id,
      patient: selectedPatient._id,
      contenu: newMessage,
      roomId,
    };
    socket.emit("send_message", messageData);
    setNewMessage("");
  };

  const filteredConversations = conversations.filter((conv) => {
    const name =
      `${conv.patientInfo?.nom} ${conv.patientInfo?.prenom}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 24 * 60 * 60 * 1000)
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  return (
    <MedicalLayout
      breadcrumb="Messages"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="messages-wrapper">
        {/* ─── LEFT SIDEBAR ─── */}
        <div className="msg-sidebar">
          <div className="msg-sidebar-header">
            <div className="msg-sidebar-header-left">
              <div className="msg-sidebar-icon">💬</div>
              <h2>Messagerie</h2>
            </div>
            <button className="msg-compose-btn" title="Nouvelle conversation">
              ✏️
            </button>
          </div>

          <div className="msg-search-box">
            <span className="msg-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher un patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="msg-contacts-list">
            {loading && (
              <div className="msg-empty-contacts">
                <div className="msg-empty-contacts-icon">⏳</div>
                <span>Chargement...</span>
              </div>
            )}

            {!loading && filteredConversations.length === 0 && (
              <div className="msg-empty-contacts">
                <div className="msg-empty-contacts-icon">💭</div>
                <span>
                  Aucune conversation pour l'instant.
                  <br />
                  Les patients vous contacteront ici.
                </span>
              </div>
            )}

            {filteredConversations.map((conv) => (
              <div
                key={conv._id}
                className={`msg-contact-item ${selectedPatient?._id === conv.patientInfo?._id ? "active" : ""}`}
                onClick={() => setSelectedPatient(conv.patientInfo)}
              >
                <div className="msg-avatar msg-avatar-online">👤</div>
                <div className="msg-contact-info">
                  <h4>
                    {conv.patientInfo?.nom} {conv.patientInfo?.prenom}
                  </h4>
                  <p>
                    {conv.lastMessage
                      ? `${conv.lastMessage.substring(0, 30)}...`
                      : "Démarrer une conversation"}
                  </p>
                </div>
                <div className="msg-contact-meta">
                  <span className="msg-contact-time">
                    {formatTime(conv.updatedAt)}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="msg-unread-badge">{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── RIGHT CHAT AREA ─── */}
        <div className="msg-chat-area">
          {!selectedPatient ? (
            <div className="msg-no-selection">
              <div className="msg-no-sel-icon">💬</div>
              <p className="msg-no-sel-title">Votre messagerie médicale</p>
              <p className="msg-no-sel-subtitle">
                Sélectionnez un patient dans la liste pour démarrer ou reprendre
                une conversation sécurisée.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="msg-chat-header">
                <div className="msg-chat-user">
                  <div
                    className="msg-avatar"
                    style={{ width: 40, height: 40, fontSize: "1.1rem" }}
                  >
                    👤
                  </div>
                  <div className="msg-chat-user-info">
                    <h3>
                      {selectedPatient.nom} {selectedPatient.prenom}
                    </h3>
                    <span className="msg-status">En ligne</span>
                  </div>
                </div>
                <div className="msg-chat-actions">
                  <button
                    className="msg-action-btn"
                    title="Voir la fiche patient"
                    onClick={() =>
                      (window.location.href = `/cardiologue/patients/${selectedPatient._id}`)
                    }
                  >
                    📄
                  </button>
                  <button className="msg-action-btn" title="Appel vidéo">
                    📹
                  </button>
                  <button className="msg-action-btn" title="Plus d'options">
                    ⋮
                  </button>
                </div>
              </div>

              {/* Chat Body */}
              <div className="msg-chat-body" ref={chatBodyRef}>
                {messages.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: "2rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                      👋
                    </div>
                    Début de la conversation avec {selectedPatient.nom}{" "}
                    {selectedPatient.prenom}
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isDoctor =
                    msg.expediteur._id === currentUser?.id ||
                    msg.expediteur === currentUser?.id;
                  const prevMsg = messages[idx - 1];
                  const showDate =
                    !prevMsg ||
                    new Date(msg.createdAt).toDateString() !==
                      new Date(prevMsg.createdAt).toDateString();

                  return (
                    <React.Fragment key={msg._id || idx}>
                      {showDate && (
                        <div className="msg-date-separator">
                          <span>
                            {new Date(msg.createdAt).toLocaleDateString(
                              "fr-FR",
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              },
                            )}
                          </span>
                        </div>
                      )}
                      <div
                        className={`msg-bubble-wrapper ${isDoctor ? "doctor" : "patient"}`}
                      >
                        {!isDoctor && (
                          <div className="msg-avatar-small">👤</div>
                        )}
                        <div className="msg-bubble-col">
                          <div
                            className={`msg-bubble ${isDoctor ? "doctor" : "patient"}`}
                          >
                            {msg.contenu}
                            <span className="msg-bubble-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        {isDoctor && (
                          <div className="msg-avatar-small doc">👨‍⚕️</div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Chat Footer */}
              <div className="msg-chat-footer">
                <div className="msg-input-wrapper">
                  <input
                    type="text"
                    placeholder="Écrire un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                  <div className="msg-input-actions">
                    <button className="msg-emoji-btn" title="Emoji">
                      😊
                    </button>
                    <button
                      className="msg-send-btn"
                      onClick={handleSend}
                      disabled={!newMessage.trim()}
                      title="Envoyer"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MedicalLayout>
  );
}
