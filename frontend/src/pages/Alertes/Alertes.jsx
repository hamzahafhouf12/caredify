import React, { useState } from "react"
import { Link } from "react-router-dom"
import MedicalLayout from "../../components/layout/MedicalLayout"
import { doctorInfo, navItems } from "../../constants/medical"
import "./Alertes.css"

const initialAlertes = [
  {
    id: 1,
    traite: false,
    date: "17/06/2025 08:00 AM",
    patient: "Natali Craig",
    avatar: "👤",
    type: "Tachycardie détectée",
    gravite: "Urgent",
    description: "FC > 170 bpm",
  },
  {
    id: 2,
    traite: true,
    date: "17/06/2025 06:40 AM",
    patient: "Orlando Diggs",
    avatar: "👤",
    type: "Arythmie suspectée",
    gravite: "Modéré",
    description: "Anomalie ECG IA",
  },
  {
    id: 3,
    traite: true,
    date: "16/06/2025 07:50 AM",
    patient: "Orlando Diggs",
    avatar: "👤",
    type: "SpO₂ instable",
    gravite: "Modéré",
    description: "Valeurs < 91%",
  },
  {
    id: 4,
    traite: true,
    date: "15/06/2025 14:20 AM",
    patient: "Orlando Diggs",
    avatar: "👤",
    type: "Arythmie fréquente",
    gravite: "Urgent",
    description: "5 contractions prématurées détectées",
  }
]

export default function Alertes() {
  const themedNavItems = navItems.map(item => ({
    ...item,
    active: item.label === "Alertes"
  }))

  const [alertes, setAlertes] = useState(initialAlertes)

  const toggleTraite = (id) => {
    setAlertes(alertes.map(a => 
      a.id === id ? { ...a, traite: !a.traite } : a
    ))
  }

  return (
    <MedicalLayout 
      breadcrumb="Alertes" 
      navItems={themedNavItems} 
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center">
        <h1 className="cdash-page-title">Liste des alertes</h1>

        {/* Toolbar */}
        <div className="cdash-list-toolbar-wrapper">
          <div className="cdash-list-toolbar">
            <button className="cdash-list-btn-icon">＋</button>
            <button className="cdash-list-btn-icon">⇅</button>
          </div>
        </div>

        {/* Table */}
        <div className="alertes-table-wrap">
          <table className="alertes-table">
            <thead>
              <tr>
                <th>traité</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Type d'alerte</th>
                <th>Gravité</th>
                <th>Description</th>
                <th>Voir fiche patient</th>
              </tr>
            </thead>
            <tbody>
              {alertes.map((alerte) => (
                <tr key={alerte.id}>
                  <td className="al-td-check">
                    <input 
                      type="checkbox" 
                      className="al-checkbox"
                      checked={alerte.traite}
                      onChange={() => toggleTraite(alerte.id)}
                    />
                  </td>
                  <td className="al-td-date">{alerte.date}</td>
                  <td>
                    <div className="al-patient-cell">
                      <span className="al-avatar-mini">{alerte.avatar}</span>
                      <strong>{alerte.patient}</strong>
                    </div>
                  </td>
                  <td className="al-td-type">{alerte.type}</td>
                  <td>
                    <span className={`al-gravite ${alerte.gravite === "Urgent" ? "al-red" : "al-black"}`}>
                      {alerte.gravite}
                    </span>
                  </td>
                  <td className="al-td-desc">{alerte.description}</td>
                  <td>
                    <Link to="/cardiologue/patients/fiche patient" className="al-link">Voir fiche</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MedicalLayout>
  )
}
