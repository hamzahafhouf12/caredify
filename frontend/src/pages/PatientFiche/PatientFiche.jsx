import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import MedicalLayout from "../../components/layout/MedicalLayout"
import { doctorInfo, navItems } from "../../constants/medical"
import "./PatientFiche.css"

/* ── Mini Graphs SVGs ── */

function MiniGraph({ points, color = "#2f80ed" }) {
  return (
    <svg viewBox="0 0 100 40" className="fiche-mini-graph">
      <polyline
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function ECGWaveformFull() {
  return (
    <svg viewBox="0 0 1000 150" className="fiche-ecg-svg" preserveAspectRatio="none">
      <polyline
        fill="none" stroke="#2f80ed" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        points="0,75 50,75 70,75 80,75 90,70 100,75 110,75 130,75 140,60 145,75 150,80 160,75 170,10 180,140 190,75 240,75 290,75 310,75 320,75 330,70 340,75 350,75 370,75 380,60 385,75 390,80 400,75 410,15 420,135 430,75 480,75 530,75 550,75 560,75 570,70 580,75 590,75 610,75 620,65 625,75 630,85 640,75 650,12 660,138 670,75 720,75 770,75 790,75 800,75 810,70 820,75 830,75 850,75 860,62 865,75 870,82 880,75 890,18 900,132 910,75 960,75 1000,75"
      />
    </svg>
  )
}

function PatientFiche() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const token = localStorage.getItem("caredify_token")
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const response = await fetch(`${API_URL}/patients/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message)
        setPatient(data)
      } catch (err) {
        setError("Erreur lors du chargement des informations du patient")
      } finally {
        setLoading(false)
      }
    }

    fetchPatient()
  }, [id])

  const themedNavItems = navItems.map(item => ({
    ...item,
    active: item.label === "Patients"
  }))

  if (loading) {
    return (
      <MedicalLayout breadcrumb="Patients / Fiche Patient" navItems={themedNavItems} doctorInfo={doctorInfo}>
        <div className="cdash-center" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <h2>Chargement...</h2>
        </div>
      </MedicalLayout>
    )
  }

  if (error || !patient) {
    return (
      <MedicalLayout breadcrumb="Patients / Fiche Patient" navItems={themedNavItems} doctorInfo={doctorInfo}>
        <div className="cdash-center" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", gap: "10px" }}>
          <h2 style={{ color: "var(--cdash-danger)" }}>{error || "Patient introuvable"}</h2>
          <button className="patients-btn-action-blue" onClick={() => navigate("/cardiologue/patients")}>Retour à la liste</button>
        </div>
      </MedicalLayout>
    )
  }

  return (
    <MedicalLayout 
      breadcrumb="Patients / Fiche Patient" 
      navItems={themedNavItems} 
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center fiche-container">
        {/* Blue Header Bar */}
        <div className="fiche-header-bar">
          <h1 className="fiche-header-title">Fiche Patient : {patient.nom}</h1>
          <button className="patients-btn-action-blue" style={{ background: "white", color: "#2f80ed", marginLeft: "auto" }} onClick={() => navigate("/cardiologue/patients")}>
            Retour
          </button>
        </div>

        {/* Patient Info Card */}
        <div className="cdash-card fiche-info-card">
          <div className="fiche-info-card__left">
            <div className="fiche-patient-avatar-wrap">
              <div className="fiche-patient-avatar">👤</div>
            </div>
            <div className="fiche-info-grid">
              <div className="fiche-info-item">
                <span className="fiche-info-label">Nom et Prénom</span>
                <span className="fiche-info-value">{patient.nom}</span>
              </div>
              <div className="fiche-info-item">
                <span className="fiche-info-label">Age</span>
                <span className="fiche-info-value">{patient.age}</span>
              </div>
              <div className="fiche-info-item">
                <span className="fiche-info-label">CIN</span>
                <span className="fiche-info-value">{patient.cin}</span>
              </div>
            </div>
          </div>

          <div className="fiche-info-divider"></div>

          <div className="fiche-info-card__right">
            <div className="fiche-info-grid">
              <div className="fiche-info-item">
                <span className="fiche-info-label">Adresse</span>
                <span className="fiche-info-value">{patient.adresse}</span>
              </div>
              <div className="fiche-info-item">
                <span className="fiche-info-label">Etat actuel</span>
                <span className="fiche-info-value">{patient.etat}</span>
              </div>
              <div className="fiche-info-item">
                <span className="fiche-info-label">Dossier</span>
                <span className="fiche-info-value">Enregistré le {new Date(patient.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vital Data Section */}
        <div className="fiche-section">
          <h2 className="fiche-section-title">Données Vitales</h2>
          <div className="fiche-vitals-grid">
            <div className="cdash-card fiche-vital-card">
              <div className="fiche-vital-card__head">
                <p className="fiche-vital-card__label">Temperature : 37.7 °C</p>
              </div>
              <MiniGraph points="0,35 10,20 20,30 30,25 40,32 50,22 60,35 70,20 80,30 90,38 100,25" />
            </div>
            <div className="cdash-card fiche-vital-card">
              <div className="fiche-vital-card__head">
                <p className="fiche-vital-card__label">PPG</p>
              </div>
              <MiniGraph points="0,20 10,35 20,20 30,35 40,20 50,35 60,20 70,35 80,20 90,35 100,20" />
            </div>
            <div className="cdash-card fiche-vital-card">
              <div className="fiche-vital-card__head">
                <p className="fiche-vital-card__label">BP (Blood Presure)<br />134/82 mm Hg</p>
              </div>
              <MiniGraph points="0,25 20,22 40,28 60,25 80,35 100,38" />
            </div>
            <div className="cdash-card fiche-vital-card">
              <div className="fiche-vital-card__head">
                <p className="fiche-vital-card__label">SpO₂ : 95%</p>
              </div>
              <MiniGraph points="0,20 20,25 40,22 60,30 80,32 100,38" />
            </div>
          </div>
        </div>

        {/* ECG Section */}
        <div className="cdash-card fiche-ecg-card">
          <div className="fiche-ecg-card__content">
            <div className="fiche-ecg-card__left">
              <h2 className="fiche-section-title">ECG</h2>
              <ECGWaveformFull />
            </div>
            <div className="fiche-ecg-card__right">
              <button className="patients-btn-action-blue" onClick={() => navigate("/cardiologue/signaux-vitaux/historique")}>Voir les autres ECG</button>
            </div>
          </div>
        </div>

        {/* Alert History Section */}
        <div className="fiche-section">
          <h2 className="fiche-section-title">Historiques des alertes</h2>
          <div className="cdash-card fiche-history-card">
             <div className="cdash-table-wrap">
                <table className="cdash-table fiche-v2-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Detail d'alerte</th>
                      <th>Type d'alerte</th>
                      <th>Commentaire de docteur</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>24/03/2026</td>
                      <td>Température élevée : 38.5°C</td>
                      <td>Modéré</td>
                      <td>Patient à surveiller, hydratation recommandée.</td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}

export default PatientFiche
