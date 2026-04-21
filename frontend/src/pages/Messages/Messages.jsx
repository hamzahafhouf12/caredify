import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import { getSocket } from "../../utils/socket";
import { apiGet } from "../../utils/api";
import { formatDate, formatTime as formatTimeUtil } from "../../utils/date";
import "./Messages.css";
import TeleconsultModal from "../../components/medical/TeleconsultModal";

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPatients, setAllPatients] = useState([]);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const navigate = useNavigate();

  const handlePatientClick = (pid) => {
    localStorage.setItem("activePatientId", pid);
    navigate("/cardiologue/patients/fichepatient");
  };
  const [searchQuery, setSearchQuery] = useState("");

  const chatBodyRef = useRef(null);
  const socket = getSocket();

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Messages",
  }));


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
        const response = await apiGet(`/messages/conversations`);
        const data = await response.json();
        if (response.ok) setConversations(data);
      } catch (err) {
        console.error("Fetch conversations error", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAllPatients = async () => {
      try {
        const response = await apiGet("/patients");
        if (response.ok) {
          const data = await response.json();
          setAllPatients(data);
        }
      } catch (err) {
        console.error("Fetch patients error", err);
      }
    };

    fetchConversations();
    fetchAllPatients();
    // Socket is a global singleton — no connect/disconnect needed here
  }, []);

  // 2. Fetch History & Join Room
  useEffect(() => {
    if (!selectedPatient || !currentUser) return;

    const fetchHistory = async () => {
      try {
        const response = await apiGet(`/messages/${selectedPatient._id}`);
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
      // Ignore messages not for this conversation
      if (msg.patient !== selectedPatient._id &&
          msg.patient?._id !== selectedPatient._id) return;
      // Ignore optimistic duplicates (messages we already added locally)
      setMessages((prev) => {
        const isDuplicate = prev.some((m) =>
          !m._id?.startsWith('opt_') && m._id === msg._id
        );
        if (isDuplicate) return prev;
        // Replace the optimistic message if it exists
        const withoutOptimistic = prev.filter((m) => !m._id?.startsWith('opt_'));
        return [...withoutOptimistic, msg];
      });
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
    const optimisticMsg = {
      _id: `opt_${Date.now()}`,
      expediteur: { _id: currentUser.id },
      destinataire: selectedPatient._id,
      patient: selectedPatient._id,
      contenu: newMessage,
      createdAt: new Date().toISOString(),
      roomId,
    };

    // Add optimistically before server confirms
    setMessages((prev) => [...prev, optimisticMsg]);

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
            <button 
              className="msg-compose-btn" 
              title="Nouvelle conversation"
              onClick={() => setIsComposeModalOpen(true)}
            >
              ✏️
            </button>
          </div>

          {/* New Conversation Selector */}
          {isComposeModalOpen && (
            <div className="msg-compose-selector">
              <div className="msg-compose-selector-head">
                <span>Démarrer une conversation</span>
                <button onClick={() => setIsComposeModalOpen(false)}>×</button>
              </div>
              <div className="msg-compose-list">
                {allPatients.map(p => (
                  <div 
                    key={p._id} 
                    className="msg-compose-item"
                    onClick={() => {
                      setSelectedPatient(p);
                      setIsComposeModalOpen(false);
                    }}
                  >
                    👤 {p.nom} {p.prenom}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      handlePatientClick(selectedPatient._id)
                    }
                  >
                    📄
                  </button>
                  <button 
                    className="msg-action-btn" 
                    title="Appel vidéo"
                    onClick={() => setIsCallModalOpen(true)}
                  >
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
                            {formatDate(msg.createdAt, "fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
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
                              {formatTimeUtil(msg.createdAt)}
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
      {/* Modal de Téléconsultation */}
      {selectedPatient && currentUser && (
        <TeleconsultModal
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
          patientName={`${selectedPatient.nom} ${selectedPatient.prenom}`}
          roomId={[currentUser.id, selectedPatient._id].sort().join("_")}
          currentUser={currentUser}
        />
      )}
    </MedicalLayout>
  );
}
