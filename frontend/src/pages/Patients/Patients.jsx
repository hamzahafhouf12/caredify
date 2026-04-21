import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import { apiGet } from "../../utils/api";
import { formatDate } from "../../utils/date";
import "./Patients.css";

function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("nom");
  const [sortDir, setSortDir] = useState("asc");
  const navigate = useNavigate();

  const viewPatient = (pid, edit = false) => {
    localStorage.setItem("activePatientId", pid);
    navigate(`/cardiologue/patients/fichepatient${edit ? "?edit=true" : ""}`);
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await apiGet("/patients");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setPatients(data);
      } catch (err) {
        setError("Erreur lors du chargement des patients");
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Patients",
  }));

  // ─── Filtrage + Tri ───────────────────────────────────────────────
  const RISK_ORDER = { "Élevé": 0, "Modéré": 1, "Faible": 2 };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredPatients = patients
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        !q ||
        (p.nom || "").toLowerCase().includes(q) ||
        (p.prenom || "").toLowerCase().includes(q) ||
        (p.cin || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let valA, valB;
      if (sortField === "nom") {
        valA = (a.nom || "").toLowerCase();
        valB = (b.nom || "").toLowerCase();
      } else if (sortField === "age") {
        valA = a.age || 0;
        valB = b.age || 0;
      } else if (sortField === "risque") {
        valA = RISK_ORDER[a.niveauRisque] ?? 3;
        valB = RISK_ORDER[b.niveauRisque] ?? 3;
      } else {
        return 0;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return <span>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <MedicalLayout
      breadcrumb="Patients"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center v2-patients-page">
        <h1 className="cdash-page-title">Listes des patients</h1>

        {/* Action Bar / Toolbar */}
        <div className="cdash-list-toolbar-wrapper">
          <div className="cdash-list-toolbar">
            <button
              className="cdash-list-btn-icon"
              onClick={() => navigate("/cardiologue/patients/add")}
              title="Ajouter un patient"
            >
              ＋
            </button>
          </div>
          <div className="v2-toolbar-right">
            <div className="v2-search-box">
              <span className="v2-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou CIN..."
                className="v2-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Patients Table Card */}
        <div className="cdash-card v2-patients-table-card">
          <div className="cdash-table-wrap">
            {loading ? (
              <p style={{ padding: "20px", textAlign: "center" }}>
                Chargement des patients...
              </p>
            ) : error ? (
              <p style={{ padding: "20px", textAlign: "center", color: "red" }}>
                {error}
              </p>
            ) : filteredPatients.length === 0 ? (
              <p style={{ padding: "20px", textAlign: "center" }}>
                {searchQuery
                  ? "Aucun patient trouvé pour cette recherche."
                  : "Aucun patient trouvé. Ajoutez-en un !"}
              </p>
            ) : (
              <table className="cdash-table v2-table">
                <thead>
                  <tr>
                    <th>CIN</th>
                    <th
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleSort("nom")}
                    >
                      Nom et Prénoms <SortIcon field="nom" />
                    </th>
                    <th
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleSort("age")}
                    >
                      Age <SortIcon field="age" />
                    </th>
                    <th
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleSort("risque")}
                    >
                      Niveau de Risque (IA) <SortIcon field="risque" />
                    </th>
                    <th>Dernier ECG</th>
                    <th>Etat</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p, idx) => (
                    <tr key={p._id || idx}>
                      <td>{p.cin}</td>
                      <td>
                        <div className="v2-patient-cell">
                          <span className="v2-patient-avatar">👤</span>
                          <span className="v2-patient-name">
                            {p.nom} {p.prenom}
                          </span>
                        </div>
                      </td>
                      <td>{p.age}</td>
                      <td>
                        <span
                          className={`v2-badge-risk v2-badge-risk--${(p.niveauRisque || "Faible")
                            .toLowerCase()
                            .replace("é", "e")
                            .replace("è", "e")}`}
                        >
                          {p.niveauRisque || "Faible"}
                        </span>
                      </td>
                      <td>
                        {p.derniereAnalyseIA
                          ? formatDate(p.derniereAnalyseIA)
                          : "Aucun"}
                      </td>
                      <td>
                        <span
                          className={`v2-status-pill v2-status--${(p.etat || "Stable").toLowerCase()}`}
                        >
                          {p.etat}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={() => viewPatient(p._id)}
                            className="v2-link-blue"
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          >
                            Voir fiche
                          </button>
                          <button
                            onClick={() => viewPatient(p._id, true)}
                            className="v2-link-blue"
                            style={{
                              color: "#f59e0b",
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          >
                            ✏️ Modifier
                          </button>
                        </div>
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
  );
}

export default Patients;
