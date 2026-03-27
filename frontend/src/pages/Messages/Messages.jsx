import React from "react"
import MedicalLayout from "../../components/layout/MedicalLayout"
import { doctorInfo, navItems } from "../../constants/medical"
import "./Messages.css"

const contacts = [
  { id: 1, name: "Lim Kenneth", time: "Il y a 1 min", active: true },
  { id: 2, name: "Kate Morrison", time: "Il y a 20 min" },
  { id: 3, name: "Drew Cano", time: "Il y a 33 min" },
  { id: 4, name: "Orlando Diggs", time: "Il y a 45 min" },
  { id: 5, name: "Natali Craig", time: "Il y a 1 h" },
  { id: 6, name: "Lim Dig", time: "Il y a 1 h" },
  { id: 7, name: "Bennet Dominique", time: "Il y a 2 h" },
]

const chatHistory = [
  { id: 1, sender: "patient", text: "Bonjour Docteur, j'ai reçu une alerte ce matin, dois-je m'inquiéter ?" },
  { id: 2, sender: "doctor", text: "Bonjour Lim, l'alerte reçue est sous contrôle. Pas d'inquiétude." },
  { id: 3, sender: "doctor", text: "L'alerte indique une fréquence élevée au lever (110 bpm), mais elle est redescendue ensuite." },
  { id: 4, sender: "patient", text: "Oui je me suis senti un peu faible pendant 2 minutes, puis ça allait mieux." },
  { id: 5, sender: "doctor", text: "Je vous recommande de vous reposer aujourd'hui, évitez tout effort brusque." },
  { id: 6, sender: "doctor", text: "Je vous envoie une ordonnance pour ajuster légèrement le traitement." },
  { id: 7, sender: "patient", text: "Merci beaucoup. Je dois refaire un ECG aujourd'hui ?" },
  { id: 8, sender: "doctor", text: "Oui, faites un enregistrement ECG vers 11h et un autre en fin de journée." },
  { id: 9, sender: "doctor", text: "Si vous ressentez à nouveau des symptômes, contactez-moi immédiatement." },
  { id: 10, sender: "patient", text: "Très bien Docteur, je vous tiens au courant. Merci pour votre réactivité !" },
  { id: 11, sender: "doctor", text: "Avec plaisir, Lim." },
]

export default function Messages() {
  const themedNavItems = navItems.map(item => ({
    ...item,
    active: item.label === "Messages"
  }))

  return (
    <MedicalLayout 
      breadcrumb="Messages" 
      navItems={themedNavItems} 
      doctorInfo={doctorInfo}
    >
      <div className="messages-wrapper cdash-center">
        
        {/* Left Sidebar: Contacts */}
        <div className="msg-sidebar">
          <div className="msg-sidebar-header">
            <span className="msg-icon-doc">👨‍⚕️</span>
            <h2>Messagerie</h2>
          </div>
          
          <div className="msg-search-box">
            <span className="msg-search-icon">🔍</span>
            <input type="text" placeholder="Search" />
          </div>

          <div className="msg-contacts-list">
            {contacts.map(c => (
              <div key={c.id} className={`msg-contact-item ${c.active ? 'active' : ''}`}>
                <div className="msg-avatar">👤</div>
                <div className="msg-contact-info">
                  <h4>{c.name}</h4>
                  <p>{c.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Area: Chat Window */}
        <div className="msg-chat-area">
          <div className="msg-chat-header">
            <div className="msg-chat-user">
              <div className="msg-avatar">👤</div>
              <div className="msg-chat-user-info">
                <h3>Lim Kenneth</h3>
                <span className="msg-status">En ligne</span>
              </div>
            </div>
            <div className="msg-chat-actions">
              <button className="msg-action-btn">📞</button>
              <button className="msg-action-btn">📹</button>
            </div>
          </div>

          <div className="msg-chat-body">
            {chatHistory.map(msg => (
              <div key={msg.id} className={`msg-bubble-wrapper ${msg.sender}`}>
                {msg.sender === "patient" && <div className="msg-avatar-small">👤</div>}
                <div className={`msg-bubble ${msg.sender}`}>
                  {msg.text}
                </div>
                {msg.sender === "doctor" && <div className="msg-avatar-small doc">👨‍⚕️</div>}
              </div>
            ))}
          </div>

          <div className="msg-chat-footer">
            <div className="msg-input-wrapper">
              <input type="text" placeholder="Ecrire un message" />
              <button className="msg-send-btn">➤</button>
            </div>
          </div>
        </div>
        
      </div>
    </MedicalLayout>
  )
}
