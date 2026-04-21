import { useState, useEffect, useCallback } from "react";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../utils/api";
import { formatDateTime } from "../../utils/date";
import VitauxModal from "../../components/medical/VitauxModal";
import "./SignauxVitaux.css";

/* ─── Mini sparkline ───────────────────────────────────────────────── */
function Sparkline({ values = [], color = "#2563eb" }) {
  if (!values || values.length < 2) {
    return <span style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

/* ─── Badge statut vital ─────────────────────────────────────────── */
function StatusBadge({ value, normal, unit, label }) {
  if (value == null) return <span className="sv-badge sv-badge--empty">—</span>;
  const isOk = value >= normal[0] && value <= normal[1];
  return (
    <span className={`sv-badge ${isOk ? "sv-badge--ok" : "sv-badge--warn"}`}>
      <strong>{value}</strong> {unit}
    </span>
  );
}

/* ─── Composant Principal ────────────────────────────────────────── */
export default function SignauxVitaux() {
  const [patients, setPatients] = useState([]);
  const [vitauxMap, setVitauxMap] = useState({}); // patientId → { last, history }
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isVitauxModalOpen, setIsVitauxModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name"); // "name" | "hr" | "spo2" | "date"
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/patients");
      if (!res.ok) return;
      const patientsData = await res.json();
      setPatients(patientsData);

      // Fetch last vitals for each patient in parallel
      const entries = await Promise.all(
        patientsData.map(async (p) => {
          try {
            const r = await apiGet(`/vitals/patient/${p._id}`);
            if (r.ok) {
              const data = await r.json();
              return [p._id, {
                last: data[0] || null,
                history: data.slice(0, 20).reverse(),
              }];
            }
          } catch { /* ignore */ }
          return [p._id, { last: null, history: [] }];
        })
      );
      setVitauxMap(Object.fromEntries(entries));
    } catch (err) {
      console.error("Erreur SignauxVitaux:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePatientClick = (pid) => {
    localStorage.setItem("activePatientId", pid);
    navigate("/cardiologue/patients/fichepatient");
  };

  const openVitauxModal = (patient, e) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setIsVitauxModalOpen(true);
  };

  // Filter + sort
  const filtered = patients
    .filter((p) => {
      const q = search.toLowerCase();
      return !q || p.nom?.toLowerCase().includes(q) || p.prenom?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.nom?.localeCompare(b.nom);
      if (sortBy === "hr") {
        const hrA = vitauxMap[a._id]?.last?.frequenceCardiaque ?? -1;
        const hrB = vitauxMap[b._id]?.last?.frequenceCardiaque ?? -1;
        return hrB - hrA;
      }
      if (sortBy === "spo2") {
        const spA = vitauxMap[a._id]?.last?.spo2 ?? 101;
        const spB = vitauxMap[b._id]?.last?.spo2 ?? 101;
        return spA - spB; // ascending so lower SpO2 (critical) is first
      }
      if (sortBy === "date") {
        const dA = vitauxMap[a._id]?.last?.createdAt || "";
        const dB = vitauxMap[b._id]?.last?.createdAt || "";
        return dB.localeCompare(dA);
      }
      return 0;
    });

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Signaux Vitaux",
  }));

  // Stats globales
  const patientsWithVitaux = Object.values(vitauxMap).filter(v => v.last).length;
  const avgHR = (() => {
    const vals = Object.values(vitauxMap).map(v => v.last?.frequenceCardiaque).filter(Boolean);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();
  const avgSpO2 = (() => {
    const vals = Object.values(vitauxMap).map(v => v.last?.spo2).filter(Boolean);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  })();
  const alertCount = Object.values(vitauxMap).filter(v => {
    const l = v.last;
    if (!l) return false;
    return (l.frequenceCardiaque && (l.frequenceCardiaque < 50 || l.frequenceCardiaque > 120)) ||
           (l.spo2 && l.spo2 < 94);
  }).length;

  return (
    <MedicalLayout breadcrumb="Signaux Vitaux" navItems={themedNavItems} doctorInfo={doctorInfo}>
      <div className="cdash-center sv-page">

        {/* ── Page Header ── */}
        <div className="sv-page-header">
          <div>
            <h1 className="sv-page-title">❤️ Monitoring des Signaux Vitaux</h1>
            <p className="sv-page-sub">Suivi en temps réel des paramètres physiologiques de vos patients</p>
          </div>
          <button
            className="sv-btn-add"
            onClick={() => { setSelectedPatient(null); setIsVitauxModalOpen(true); }}
          >
            ＋ Saisir des Vitaux
          </button>
        </div>

        {/* ── KPI Stats ── */}
        <div className="sv-stats-row">
          <div className="sv-stat-card sv-stat--blue">
            <span className="sv-stat-icon">👥</span>
            <div>
              <div className="sv-stat-val">{patients.length}</div>
              <div className="sv-stat-label">Patients suivis</div>
            </div>
          </div>
          <div className="sv-stat-card sv-stat--green">
            <span className="sv-stat-icon">📊</span>
            <div>
              <div className="sv-stat-val">{patientsWithVitaux}</div>
              <div className="sv-stat-label">Avec données vitales</div>
            </div>
          </div>
          <div className="sv-stat-card sv-stat--teal">
            <span className="sv-stat-icon">❤️</span>
            <div>
              <div className="sv-stat-val">{avgHR ?? "—"} <small>bpm</small></div>
              <div className="sv-stat-label">FC moyenne</div>
            </div>
          </div>
          <div className="sv-stat-card sv-stat--cyan">
            <span className="sv-stat-icon">🫁</span>
            <div>
              <div className="sv-stat-val">{avgSpO2 ?? "—"} <small>%</small></div>
              <div className="sv-stat-label">SpO₂ moyenne</div>
            </div>
          </div>
          {alertCount > 0 && (
            <div className="sv-stat-card sv-stat--red">
              <span className="sv-stat-icon">⚠️</span>
              <div>
                <div className="sv-stat-val">{alertCount}</div>
                <div className="sv-stat-label">Hors plage normale</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Toolbar ── */}
        <div className="sv-toolbar">
          <div className="sv-search-wrap">
            <span className="sv-search-icon">🔍</span>
            <input
              className="sv-search-input"
              placeholder="Rechercher un patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sv-sort-group">
            <span className="sv-sort-label">Trier par :</span>
            {[
              { key: "name",  label: "Nom" },
              { key: "hr",    label: "FC ↓" },
              { key: "spo2",  label: "SpO₂ ↑" },
              { key: "date",  label: "Date" },
            ].map((s) => (
              <button
                key={s.key}
                className={`sv-sort-btn ${sortBy === s.key ? "active" : ""}`}
                onClick={() => setSortBy(s.key)}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="sv-loading">
            <div className="cdash-spinner" />
            <p>Chargement des données vitales...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sv-empty">
            <span className="sv-empty-icon">📋</span>
            <h3>Aucun patient trouvé</h3>
            <p>{search ? "Essayez un autre nom." : "Aucun patient n'est enregistré."}</p>
          </div>
        ) : (
          <div className="cdash-card sv-table-card">
            <div className="cdash-table-wrap">
              <table className="cdash-table sv-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>❤️ FC (bpm)</th>
                    <th>🫁 SpO₂ (%)</th>
                    <th>🩺 Tension</th>
                    <th>🌡️ Temp (°C)</th>
                    <th>📈 Tendance FC</th>
                    <th>Dernière mesure</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const vitaux = vitauxMap[p._id];
                    const last = vitaux?.last;
                    const history = vitaux?.history || [];
                    const hrHistory = history.map(v => v.frequenceCardiaque).filter(Boolean);

                    const hrAlert = last?.frequenceCardiaque &&
                      (last.frequenceCardiaque < 50 || last.frequenceCardiaque > 120);
                    const spo2Alert = last?.spo2 && last.spo2 < 94;

                    return (
                      <tr
                        key={p._id}
                        className={`sv-row ${hrAlert || spo2Alert ? "sv-row--alert" : ""}`}
                        onClick={() => handlePatientClick(p._id)}
                        title="Voir la fiche patient"
                      >
                        <td>
                          <div className="sv-patient-cell">
                            <div className={`sv-avatar ${hrAlert || spo2Alert ? "sv-avatar--red" : ""}`}>
                              {p.nom?.[0]?.toUpperCase()}{p.prenom?.[0]?.toUpperCase() || ""}
                            </div>
                            <div>
                              <div className="sv-patient-name">{p.nom} {p.prenom}</div>
                              <div className="sv-patient-meta">{p.age} ans • {p.etat}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusBadge value={last?.frequenceCardiaque} normal={[50, 100]} unit="bpm" />
                        </td>
                        <td>
                          <StatusBadge value={last?.spo2} normal={[94, 100]} unit="%" />
                        </td>
                        <td>
                          {last?.tensionSystolique && last?.tensionDiastolique ? (
                            <span className="sv-tension">
                              <strong>{last.tensionSystolique}</strong>/<strong>{last.tensionDiastolique}</strong>
                              <span className="sv-unit"> mmHg</span>
                            </span>
                          ) : <span className="sv-badge sv-badge--empty">—</span>}
                        </td>
                        <td>
                          {last?.temperature ? (
                            <span className={`sv-badge ${last.temperature > 38 ? "sv-badge--warn" : "sv-badge--ok"}`}>
                              <strong>{last.temperature}</strong> °C
                            </span>
                          ) : <span className="sv-badge sv-badge--empty">—</span>}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Sparkline values={hrHistory} color={hrAlert ? "#ef4444" : "#2563eb"} />
                        </td>
                        <td className="sv-date-cell">
                          {last?.createdAt ? (
                            <span>{formatDateTime(last.createdAt)}</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Jamais</span>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="sv-actions">
                            <button
                              className="sv-btn-saisir"
                              onClick={(e) => openVitauxModal(p, e)}
                              title="Saisir des vitaux"
                            >
                              ＋ Vitaux
                            </button>
                            <button
                              className="sv-btn-fiche"
                              onClick={() => handlePatientClick(p._id)}
                              title="Voir la fiche"
                            >
                              Fiche →
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── No data info box ── */}
        {!loading && patientsWithVitaux === 0 && patients.length > 0 && (
          <div className="sv-info-box">
            <span>💡</span>
            <p>
              Aucun signe vital n'a encore été enregistré. Cliquez sur <strong>"＋ Vitaux"</strong> à côté
              d'un patient pour saisir les premières mesures manuellement.
            </p>
          </div>
        )}

      </div>

      {/* ── Modal saisie vitaux ── */}
      <VitauxModal
        isOpen={isVitauxModalOpen}
        onClose={() => { setIsVitauxModalOpen(false); setSelectedPatient(null); }}
        patientId={selectedPatient?._id || null}
        patientName={selectedPatient ? `${selectedPatient.nom} ${selectedPatient.prenom || ""}` : ""}
        onSaved={() => fetchData()}
      />
    </MedicalLayout>
  );
}
