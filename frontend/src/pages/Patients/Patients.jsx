import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import MedicalLayout from "../../components/layout/MedicalLayout"
import { doctorInfo, navItems } from "../../constants/medical"
import "./Patients.css"

function Patients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem("caredify_token")
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const response = await fetch(`${API_URL}/patients`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message)
        setPatients(data)
      } catch (err) {
        setError("Erreur lors du chargement des patients")
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [])

  const themedNavItems = navItems.map(item => ({
    ...item,
    active: item.label === "Patients"
  }))

  return (
    <MedicalLayout breadcrumb="Patients" navItems={themedNavItems} doctorInfo={doctorInfo}>
      <div className="cdash-center v2-patients-page">
        <h1 className="cdash-page-title">Listes des patients</h1>

        {/* Action Bar / Toolbar */}
        <div className="cdash-list-toolbar-wrapper">
          <div className="cdash-list-toolbar">
            <button className="cdash-list-btn-icon" onClick={() => navigate("/cardiologue/patients/add")}>＋</button>
            <button className="cdash-list-btn-icon">⇅</button>
          </div>
          <div className="v2-toolbar-right">
            <div className="v2-search-box">
              <span className="v2-search-icon">🔍</span>
              <input type="text" placeholder="Recherche" className="v2-search-input" />
            </div>
          </div>
        </div>

        {/* Patients Table Card */}
        <div className="cdash-card v2-patients-table-card">
          <div className="cdash-table-wrap">
            {loading ? (
              <p style={{ padding: "20px", textAlign: "center" }}>Chargement des patients...</p>
            ) : error ? (
              <p style={{ padding: "20px", textAlign: "center", color: "red" }}>{error}</p>
            ) : patients.length === 0 ? (
              <p style={{ padding: "20px", textAlign: "center" }}>Aucun patient trouvé. Ajoutez-en un !</p>
            ) : (
              <table className="cdash-table v2-table">
                <thead>
                  <tr>
                    <th>CIN</th>
                    <th>Nom et Prénoms</th>
                    <th>Age</th>
                    <th>Addresse</th>
                    <th>Etat</th>
                    <th>Voir fiche</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p, idx) => (
                    <tr key={p._id || idx}>
                      <td>{p.cin}</td>
                      <td>
                        <div className="v2-patient-cell">
                          <span className="v2-patient-avatar">👤</span>
                          <span className="v2-patient-name">{p.nom}</span>
                        </div>
                      </td>
                      <td>{p.age}</td>
                      <td>{p.adresse}</td>
                      <td>{p.etat}</td>
                      <td>
                        <Link to={`/cardiologue/patients/${p._id}`} className="v2-link-blue">
                          Voir fiche
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </MedicalLayout>
  )
}

export default Patients
