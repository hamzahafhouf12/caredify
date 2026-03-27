import { Link } from "react-router-dom"
import "./HistoriqueECG.css"

const historyData = [
  {
    id: 1,
    date: "17/06/2025 08:00 AM",
    analyse: "Tachycardie détectée",
    frequence: "176 bpm",
    gravite: "Urgente",
  },
  {
    id: 2,
    date: "10/06/2025 10:20 AM",
    analyse: "Arythmie suspectée",
    frequence: "95 bpm",
    gravite: "Modéré",
  },
  {
    id: 3,
    date: "05/06/2025 02:30 PM",
    analyse: "Bradycardie",
    frequence: "52 bpm",
    gravite: "Urgente",
  }
]

function LargeECG() {
  return (
    <svg viewBox="0 0 400 60" width="100%" height="80" className="historique-ecg-graph" preserveAspectRatio="none">
      <polyline
        fill="none" stroke="#2f80ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        points="0,30 20,30 25,20 30,30 35,30 40,10 45,50 50,30 65,30 70,25 75,30 80,30 90,30 
                120,30 125,20 130,30 135,30 140,5 145,55 150,30 165,30 170,20 175,30 180,30 190,30
                220,30 225,20 230,30 235,30 240,10 245,50 250,30 265,30 270,25 275,30 280,30 290,30
                320,30 325,20 330,30 335,30 340,5 345,55 350,30 365,30 370,20 375,30 380,30 400,30"
      />
    </svg>
  )
}

function HistoriqueECG() {
  const isDark = document.body.classList.contains("theme-dark") || localStorage.getItem("appTheme") === "dark";

  return (
    <div className={`historique-page ${isDark ? "cdash--dark" : ""}`}>
      <div className="historique-header">
        <Link to="/cardiologue/signaux-vitaux" className="historique-back-link">Retour à la page</Link>
        <h1 className="cdash-page-title historique-title">Liste des ECG</h1>
      </div>

      <div className="cdash-list-toolbar-wrapper">
        <div className="cdash-list-toolbar">
          <button className="cdash-list-btn-icon">＋</button>
          <button className="cdash-list-btn-icon">⇅</button>
        </div>
      </div>

      <div className="historique-list">
        {historyData.map(item => (
          <div key={item.id} className="historique-card">
            <div className="hc-left">
              <div className="hc-date">
                <strong>Date : </strong>{item.date}
              </div>
              <div className="hc-graph">
                <LargeECG />
              </div>
            </div>

            <div className="hc-analysis">
              <div className="hc-row">
                <span className="hc-label">Analyse :</span>
                <span className="hc-value">{item.analyse}</span>
              </div>
              <div className="hc-row">
                <span className="hc-label">Fréquence :</span>
                <span className="hc-value">{item.frequence}</span>
              </div>
              <div className="hc-row">
                <span className="hc-label">Gravité :</span>
                <span className={`hc-value hc-gravite ${item.gravite === "Urgente" ? "hc-red" : "hc-black"}`}>
                  {item.gravite}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HistoriqueECG
