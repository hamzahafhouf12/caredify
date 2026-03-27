import MedicalLayout from "../../components/layout/MedicalLayout"
import { doctorInfo, navItems } from "../../constants/medical"
import { Link } from "react-router-dom"
import "./SignauxVitaux.css"

/* ─── Données mock ────────────────────────────────────────── */

const themedNavItems = navItems.map(item => ({
  ...item,
  active: item.label === "Signaux Vitaux"
}))

const ecgData = [
  { date: "11/05/2025 08:00", patient: "Natali Craig", analyse: "Tachycardie détectée", avatar: "👤" },
  { date: "12/05/2025 10:58", patient: "Kate Morrison", analyse: "Rythme sinusal normal", avatar: "👤" },
  { date: "11/05/2025 09:00", patient: "Drew Cano", analyse: "Tachycardie détectée", avatar: "👤" },
  { date: "11/05/2025 20:30", patient: "Orlando Diggs", analyse: "Rythme sinusal normal", avatar: "👤" },
  { date: "14/05/2025 17:00", patient: "Andi Lane", analyse: "Arythmie suspectée", avatar: "👤" },
  { date: "11/05/2025 08:25", patient: "Natali Craig", analyse: "SpO₂ instable détectée", avatar: "👤" },
  { date: "11/05/2025 20:00", patient: "Kate Morrison", analyse: "Bradycardie", avatar: "👤" },
  { date: "15/05/2025 15:44", patient: "Drew Cano", analyse: "Normal", avatar: "👤" },
  { date: "11/05/2025 08:17", patient: "Orlando Diggs", analyse: "Extrasystole", avatar: "👤" },
  { date: "16/05/2025 11:00", patient: "Andi Lane", analyse: "SpO₂ instable détectée", avatar: "👤" },
]

function MiniECG() {
  return (
    <svg viewBox="0 0 100 30" width="80" height="24" className="signaux-mini-ecg">
      <polyline
        fill="none" stroke="#2f80ed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        points="0,15 10,15 15,10 20,15 25,15 30,5 35,25 40,15 50,15 60,15 65,10 70,15 75,15 80,2 85,28 90,15 100,15"
      />
    </svg>
  )
}

function SignauxVitaux() {
  return (
    <MedicalLayout 
      breadcrumb="Signaux Vitaux" 
      navItems={themedNavItems} 
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center">
        <h1 className="cdash-page-title">Liste des ECG</h1>

        {/* Action Bar */}
        <div className="cdash-list-toolbar-wrapper">
          <div className="cdash-list-toolbar">
            <button className="cdash-list-btn-icon">＋</button>
            <button className="cdash-list-btn-icon">⇅</button>
          </div>
        </div>

        {/* ECG Table */}
        <div className="cdash-card signaux-table-card">
          <div className="cdash-table-wrap">
            <table className="cdash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Analyse</th>
                  <th>Dernier ECG</th>
                  <th>Voir Historique ECG</th>
                  <th>Voir Fiche patient</th>
                </tr>
              </thead>
              <tbody>
                {ecgData.map((item, idx) => (
                  <tr key={idx}>
                    <td className="signaux-td-date">{item.date}</td>
                    <td>
                      <div className="patient-name-cell">
                        <span className="patient-avatar-mini">{item.avatar}</span>
                        <strong>{item.patient}</strong>
                      </div>
                    </td>
                    <td className="signaux-td-analyse">{item.analyse}</td>
                    <td>
                      <div className="signaux-ecg-stack">
                        <MiniECG />
                        <MiniECG />
                        <MiniECG />
                      </div>
                    </td>
                    <td>
                      <Link to="/cardiologue/signaux-vitaux/historique" className="cdash-link-action cdash-link-action--sm">Historique ECG</Link>
                    </td>
                    <td>
                      <Link to="/cardiologue/patients/fiche patient" className="cdash-link-action cdash-link-action--sm">Voir fiche</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}

export default SignauxVitaux
