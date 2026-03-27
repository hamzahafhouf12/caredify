import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import MedicalLayout from "../../components/layout/MedicalLayout"
import { doctorInfo, navItems } from "../../constants/medical"
import "./CardiologueDashboard.css"

const statsVitales = [
  { label: "ECG moyenne", value: "76 bpm" },
  { label: "PPG moyenne", value: <span className="cdash-vitals-wave-svg">〰️</span> }, 
  { label: "SpO₂ moyenne", value: "97%" },
  { label: "Temperature moyenne", value: "36.8 °C" },
]

const recentMessages = [
  { from: "Lim Kenneth", text: "J'ai eu une douleur ce matin.", time: "Il y a 2 min", avatar: "👤" },
  { from: "Smith Barbara", text: "Ma tension est montée à 15/10 aujourd'hui.", time: "Il y a 21 min", avatar: "👤" },
  { from: "Bennet Dominique", text: "J'ai reçu une alerte hier, est-ce que c'est grave ?", time: "Il y a 30 min", avatar: "👤" },
]

function getStatusColor(etat) {
  if (!etat) return "blue";
  switch (etat.toLowerCase()) {
    case "critique":
    case "risque élevé": return "red";
    case "sous surveillance": return "blue-light";
    default: return "blue";
  }
}

function formatTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Il y a ${minutes || 1} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return new Date(dateStr).toLocaleDateString();
}

/* ─── Composant ────────────────────────────────────────── */

function CardiologueDashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    urgentesCount: 0,
    urgentesList: [],
    moderesList: [],
    recentPatients: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("caredify_token")
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
        const response = await fetch(`${API_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (err) {
        console.error("Dashboard Stats Error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const themedNavItems = navItems.map(item => ({
    ...item,
    active: item.label === "Tableau De Board"
  }))

  const patientsSuivis = stats.recentPatients.map(p => ({
    id: p._id,
    nom: `${p.nom} ${p.prenom}`,
    age: p.age || 40, 
    etat: p.etat || "Stable",
    etatColor: getStatusColor(p.etat)
  }))

  const alertsUrgentes = stats.urgentesList.map(a => ({
    name: a.patient ? `${a.patient.nom} ${a.patient.prenom}` : "Patient Inconnu",
    detail: a.detail,
    time: formatTime(a.createdAt),
    patientId: a.patient ? a.patient._id : ""
  }))

  const alertsModeres = stats.moderesList.map(a => ({
    name: a.patient ? `${a.patient.nom} ${a.patient.prenom}` : "Patient Inconnu",
    detail: a.detail,
    time: formatTime(a.createdAt),
    patientId: a.patient ? a.patient._id : ""
  }))

  return (
    <MedicalLayout 
      breadcrumb="Tableau de Board" 
      navItems={themedNavItems} 
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center v3-dashboard">
        {/* Date Selector Header */}
        <div className="v3-header-date">
           <span>Aujourd'hui : <strong>19/06/2025</strong></span>
           <span className="v3-date-chevron">⌄</span>
        </div>

        {/* Top Stats Trio */}
        <div className="v3-stats-grid">
          <div className="v3-stat-card v3-card--blue">
            <span className="v3-stat-label">Patients</span>
            <span className="v3-stat-value">{loading ? "-" : stats.totalPatients}</span>
          </div>
          <div className="v3-stat-card v3-card--blue-alt">
            <span className="v3-stat-label">Messages non lues</span>
            <span className="v3-stat-value">5</span>
          </div>
          <div className="v3-stat-card v3-card--red">
            <div className="v3-alert-text-group">
              <span className="v3-stat-label">Alertes urgentes</span>
              <span className="v3-stat-value-large">{loading ? "-" : stats.urgentesCount}</span>
            </div>
            <div className="v3-stat-card__icon">⚠️</div>
          </div>
        </div>

        {/* Middle Row: Patients & Vitals */}
        <div className="cdash-duo v3-middle-row">
          <div className="cdash-card v3-patients-card">
            <div className="cdash-card__head">
              <h2 className="cdash-card__title">Patients Suivis : {stats.totalPatients}</h2>
              <Link to="/cardiologue/patients" className="v3-link-blue">Voir tous les patients</Link>
            </div>
            <div className="v3-patients-list">
              {patientsSuivis.map((p, idx) => (
                <div key={idx} className="v3-patient-row">
                  <span className="v3-patient-icon">👤</span>
                  <span className="v3-patient-name">{p.nom}</span>
                  <span className="v3-patient-age">- {p.age} ans</span>
                  <span className={`v3-patient-status v3-status--${p.etatColor}`}>- {p.etat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="cdash-card v3-vitals-card">
            <h2 className="v3-vitals-title">Statistiques Vitales en temps réel:</h2>
            <div className="v3-vitals-list">
              {statsVitales.map((v, idx) => (
                <div key={idx} className="v3-vital-item">
                  <span className="v3-vital-label">{v.label}</span>
                  <span className="v3-vital-value">{v.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Messages Récents */}
        <div className="cdash-card v3-messages-card">
          <h2 className="v3-section-title">Messages récents :</h2>
          <div className="v3-messages-list">
            {recentMessages.map((m, idx) => (
              <div key={idx} className="v3-msg-item">
                <div className="v3-msg-avatar">👤</div>
                <div className="v3-msg-content">
                  <span className="v3-msg-name">{m.from}</span>
                  <span className="v3-msg-text">{m.text}</span>
                </div>
                <span className="v3-msg-time">{m.time}</span>
              </div>
            ))}
          </div>
          <Link to="#" className="v3-link-blue v3-msg-footer-link">Aller à la messagerie</Link>
        </div>

        {/* Dernier ECG Card */}
        <div className="cdash-card v3-ecg-card">
          <h2 className="v3-section-title">Dernier ECG :</h2>
          <div className="v3-ecg-grid-container">
            <svg viewBox="0 0 800 160" className="v3-ecg-trace-svg">
               <polyline
                 fill="none" stroke="#222" strokeWidth="1.5"
                 points="0,80 40,80 60,80 70,80 80,75 90,80 100,80 120,80 130,65 135,80 140,85 150,80 160,20 170,140 180,80 220,80 260,80 280,80 290,80 300,75 310,80 320,80 340,80 350,65 355,80 360,85 370,80 380,20 390,140 400,80 440,80 480,80 500,80 510,80 520,75 530,80 540,80 560,80 570,65 575,80 580,85 590,80 600,20 610,140 620,80 660,80 700,80 720,80 730,80 740,75 750,80 760,80 780,80 790,65 795,80 800,85"
               />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Panel: Alerts categorization */}
      <div className="v3-alerts-panel">
        <h2 className="v3-right-title">Alertes :</h2>
        
        <div className="v3-alert-category">
          <h3 className="v3-cat-title v3-text--red">Alertes urgentes:</h3>
          {alertsUrgentes.length === 0 && !loading && <p style={{color:"#888", fontSize:"13px", marginTop:"10px"}}>Aucune alerte urgente</p>}
          {alertsUrgentes.map((a, idx) => (
            <div key={idx} className="v3-alert-item">
               <div className="v3-alert-left">
                  <div className="v3-alert-avatar">👤</div>
                  <div className="v3-alert-info">
                     <span className="v3-alert-pname">{a.name}</span>
                     <span className="v3-alert-detail">{a.detail}</span>
                     {a.patientId ? (
                       <Link to={`/cardiologue/patients/${a.patientId}`} className="v3-alert-link">Voir la fiche de patient</Link>
                     ) : (
                       <span className="v3-alert-link" style={{color:"#888", textDecoration:"none"}}>Voir la fiche de patient</span>
                     )}
                  </div>
               </div>
               <span className="v3-alert-time">{a.time}</span>
            </div>
          ))}
        </div>

        <div className="v3-alert-divider"></div>

        <div className="v3-alert-category">
          <h3 className="v3-cat-title v3-text--orange">Alertes modérés:</h3>
          {alertsModeres.length === 0 && !loading && <p style={{color:"#888", fontSize:"13px", marginTop:"10px"}}>Aucune alerte modérée</p>}
          {alertsModeres.map((a, idx) => (
            <div key={idx} className="v3-alert-item">
               <div className="v3-alert-left">
                  <div className="v3-alert-avatar">👤</div>
                  <div className="v3-alert-info">
                     <span className="v3-alert-pname">{a.name}</span>
                     <span className="v3-alert-detail">{a.detail}</span>
                     {a.patientId ? (
                       <Link to={`/cardiologue/patients/${a.patientId}`} className="v3-alert-link">Voir la fiche de patient</Link>
                     ) : (
                       <span className="v3-alert-link" style={{color:"#888", textDecoration:"none"}}>Voir la fiche de patient</span>
                     )}
                  </div>
               </div>
               <span className="v3-alert-time">{a.time}</span>
            </div>
          ))}
        </div>

        <div className="v3-alert-divider"></div>

        <div className="v3-alert-category">
          <h3 className="v3-cat-title v3-text--blue">Alertes Info:</h3>
          <div className="v3-alert-item">
             <div className="v3-alert-left">
                <div className="v3-alert-avatar">👤</div>
                <div className="v3-alert-info">
                   <span className="v3-alert-pname">Lim Kenneth</span>
                   <span className="v3-alert-detail">SpO₂ instable</span>
                   <Link to="/cardiologue/patients/fiche patient" className="v3-alert-link">Voir la fiche de patient</Link>
                </div>
             </div>
             <span className="v3-alert-time">Il y a 10 min</span>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}

export default CardiologueDashboard
