import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import "./CardiologueDashboard.css";

function getStatusColor(etat) {
  if (!etat) return "blue";
  switch (etat.toLowerCase()) {
    case "critique":
    case "risque élevé":
      return "red";
    case "sous surveillance":
      return "blue-light";
    default:
      return "blue";
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

/* ─── Petit Graphique de Tendance (Sparkline) ─── */
function TrendChart({ data, color = "#2563eb", height = 30 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="v3-sparkline">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/* ─── Composant ────────────────────────────────────────── */

function CardiologueDashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    urgentesCount: 0,
    unreadMessagesCount: 0,
    patientsRisqueEleve: [],
    alerts: { urgentes: [], moderes: [], info: [] },
    recentPatients: [],
    recentMessages: [],
    vitals: { avgFrequenceCardiaque: null, avgHrv: null, avgSpo2: null, trends: [] },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("caredify_token");
        const API_URL =
          import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const response = await fetch(`${API_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Dashboard Stats Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Tableau De Board",
  }));

  const patientsSuivis = stats.recentPatients.map((p) => ({
    id: p._id,
    nom: `${p.nom} ${p.prenom}`,
    age: p.age || 40,
    etat: p.etat || "Stable",
    etatColor: getStatusColor(p.etat),
  }));

  const alertsUrgentes = stats.alerts.urgentes.map((a) => ({
    name: a.patient
      ? `${a.patient.nom} ${a.patient.prenom}`
      : "Patient Inconnu",
    detail: a.detail,
    time: formatTime(a.createdAt),
    patientId: a.patient ? a.patient._id : "",
  }));

  const alertsModeres = stats.alerts.moderes.map((a) => ({
    name: a.patient
      ? `${a.patient.nom} ${a.patient.prenom}`
      : "Patient Inconnu",
    detail: a.detail,
    time: formatTime(a.createdAt),
    patientId: a.patient ? a.patient._id : "",
  }));

  const alertsInfo = stats.alerts.info.map((a) => ({
    name: a.patient
      ? `${a.patient.nom} ${a.patient.prenom}`
      : "Patient Inconnu",
    detail: a.detail,
    time: formatTime(a.createdAt),
    patientId: a.patient ? a.patient._id : "",
  }));

  const displayVitals = [
    {
      label: "ECG moyenne",
      value: stats.vitals.avgFrequenceCardiaque
        ? `${stats.vitals.avgFrequenceCardiaque} bpm`
        : "-",
    },
    {
      label: "PPG moyenne",
      value: <span className="cdash-vitals-wave-svg">〰️</span>,
    },
    {
      label: "SpO₂ moyenne",
      value: stats.vitals.avgSpo2 ? `${stats.vitals.avgSpo2}%` : "-",
    },
    {
      label: "HRV moyenne",
      value: stats.vitals.avgHrv ? `${stats.vitals.avgHrv} ms` : "-",
    },
  ];

  const mappedMessages = stats.recentMessages.map((m) => ({
    from: m.patient
      ? `${m.patient.nom} ${m.patient.prenom}`
      : m.expediteur
        ? `${m.expediteur.nom} ${m.expediteur.prenom}`
        : "Inconnu",
    text: m.contenu,
    time: formatTime(m.createdAt),
    avatar: "👤",
  }));

  return (
    <MedicalLayout
      breadcrumb="Tableau de Board"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center v3-dashboard">
        {/* Date Selector Header */}
        <div className="v3-header-date">
          <span>
            Aujourd'hui :{" "}
            <strong>
              {new Date().toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </strong>
          </span>
          <span className="v3-date-chevron">⌄</span>
        </div>

        {/* Top Stats Trio */}
        <div className="v3-stats-grid">
          <div className="v3-stat-card v3-card--blue">
            <span className="v3-stat-label">Patients</span>
            <span className="v3-stat-value">
              {loading ? "-" : stats.totalPatients}
            </span>
          </div>
          <div className="v3-stat-card v3-card--blue-alt">
            <span className="v3-stat-label">Messages non lus</span>
            <span className="v3-stat-value">
              {loading ? "-" : stats.unreadMessagesCount}
            </span>
          </div>
          <div className="v3-stat-card v3-card--red">
            <div className="v3-alert-text-group">
              <span className="v3-stat-label">Alertes urgentes</span>
              <span className="v3-stat-value-large">
                {loading ? "-" : stats.urgentesCount}
              </span>
            </div>
            <div className="v3-stat-card__icon">⚠️</div>
          </div>
        </div>

        {/* SECTION PRIORITAIRE : ANALYSE IA */}
        <div className="v3-priorite-ia-row">
          <div className="cdash-card v3-ia-alerts-card">
            <div className="cdash-card__head">
              <h2 className="cdash-card__title">🚀 Analyse Prioritaire (IA)</h2>
              <span className="v3-badge--red">Risque Élevé</span>
            </div>
            <div className="v3-ia-list">
              {stats.patientsRisqueEleve.length === 0 && !loading && (
                <p className="v3-empty-text">Aucun patient à haut risque détecté.</p>
              )}
              {stats.patientsRisqueEleve.map((p, idx) => (
                <div key={idx} className="v3-ia-item">
                  <div className="v3-ia-info">
                    <span className="v3-ia-name">{p.nom} {p.prenom}</span>
                    <span className="v3-ia-meta">{p.age} ans • {p.etat}</span>
                  </div>
                  <div className="v3-ia-risk-badge">
                    <span className="v3-risk-label">Niveau de Risque</span>
                    <span className="v3-risk-value">Élevé</span>
                  </div>
                  <Link to={`/cardiologue/patients/${p._id}`} className="v3-btn-icon-link">➔</Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Row: Patients & Vitals */}
        <div className="cdash-duo v3-middle-row">
          <div className="cdash-card v3-patients-card">
            <div className="cdash-card__head">
              <h2 className="cdash-card__title">
                Patients Suivis : {stats.totalPatients}
              </h2>
              <Link to="/cardiologue/patients" className="v3-link-blue">
                Voir tous les patients
              </Link>
            </div>
            <div className="v3-patients-list">
              {patientsSuivis.map((p, idx) => (
                <div key={idx} className="v3-patient-row">
                  <span className="v3-patient-icon">👤</span>
                  <span className="v3-patient-name">{p.nom}</span>
                  <span className="v3-patient-age">- {p.age} ans</span>
                  <span
                    className={`v3-patient-status v3-status--${p.etatColor}`}
                  >
                    - {p.etat}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="v3-card v3-vitals-card">
            <h2 className="v3-vitals-title">Tendances Vitales (7j) :</h2>
            <div className="v3-vitals-trends-grid">
              <div className="v3-trend-item">
                <div className="v3-trend-meta">
                  <span className="v3-trend-label">Fréquence Cardiaque</span>
                  <span className="v3-trend-val">{stats.vitals.avgFrequenceCardiaque || '--'} bpm</span>
                </div>
                <TrendChart data={stats.vitals.trends.map(t => t.hr)} color="#2563eb" />
              </div>
              <div className="v3-trend-item">
                <div className="v3-trend-meta">
                  <span className="v3-trend-label">Variabilité HRV</span>
                  <span className="v3-trend-val">{stats.vitals.avgHrv || '--'} ms</span>
                </div>
                <TrendChart data={stats.vitals.trends.map(t => t.hrv)} color="#0ea5e9" />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Récents */}
        <div className="cdash-card v3-messages-card">
          <h2 className="v3-section-title">Messages récents :</h2>
          <div className="v3-messages-list">
            {mappedMessages.length === 0 && !loading && (
              <p style={{ color: "#888", padding: "10px" }}>
                Aucun message récent
              </p>
            )}
            {mappedMessages.map((m, idx) => (
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
          <Link
            to="/cardiologue/messages"
            className="v3-link-blue v3-msg-footer-link"
          >
            Aller à la messagerie
          </Link>
        </div>

        {/* Dernier ECG Card */}
        <div className="cdash-card v3-ecg-card">
          <div className="v3-head-row">
            <h2 className="v3-section-title">
              Dernier ECG{" "}
              {stats.dernierECG?.patient &&
                `(${stats.dernierECG.patient.nom} ${stats.dernierECG.patient.prenom})`}{" "}
              :
            </h2>
            {stats.dernierECG && (
              <span className="v3-ecg-time">
                {formatTime(stats.dernierECG.createdAt)}
              </span>
            )}
          </div>
          <div className="v3-ecg-grid-container">
            {stats.dernierECG?.signalData?.length > 0 ? (
              <svg viewBox="0 0 800 160" className="v3-ecg-trace-svg">
                <polyline
                  fill="none"
                  stroke="#222"
                  strokeWidth="1.5"
                  points={stats.dernierECG.signalData
                    .map(
                      (val, i) =>
                        `${(i / (stats.dernierECG.signalData.length - 1)) * 800},${80 - val * 60}`,
                    )
                    .join(" ")}
                />
              </svg>
            ) : (
              <div
                style={{
                  height: "160px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#888",
                }}
              >
                Aucun tracé ECG récent reçu.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Alerts categorization */}
      <div className="v3-alerts-panel">
        <h2 className="v3-right-title">Alertes :</h2>

        <div className="v3-alert-category">
          <h3 className="v3-cat-title v3-text--red">Alertes urgentes:</h3>
          {alertsUrgentes.length === 0 && !loading && (
            <p style={{ color: "#888", fontSize: "13px", marginTop: "10px" }}>
              Aucune alerte urgente
            </p>
          )}
          {alertsUrgentes.map((a, idx) => (
            <div key={idx} className="v3-alert-item">
              <div className="v3-alert-left">
                <div className="v3-alert-avatar">👤</div>
                <div className="v3-alert-info">
                  <span className="v3-alert-pname">{a.name}</span>
                  <span className="v3-alert-detail">{a.detail}</span>
                  {a.patientId ? (
                    <Link
                      to={`/cardiologue/patients/${a.patientId}`}
                      className="v3-alert-link"
                    >
                      Voir la fiche de patient
                    </Link>
                  ) : (
                    <span
                      className="v3-alert-link"
                      style={{ color: "#888", textDecoration: "none" }}
                    >
                      Voir la fiche de patient
                    </span>
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
          {alertsModeres.length === 0 && !loading && (
            <p style={{ color: "#888", fontSize: "13px", marginTop: "10px" }}>
              Aucune alerte modérée
            </p>
          )}
          {alertsModeres.map((a, idx) => (
            <div key={idx} className="v3-alert-item">
              <div className="v3-alert-left">
                <div className="v3-alert-avatar">👤</div>
                <div className="v3-alert-info">
                  <span className="v3-alert-pname">{a.name}</span>
                  <span className="v3-alert-detail">{a.detail}</span>
                  {a.patientId ? (
                    <Link
                      to={`/cardiologue/patients/${a.patientId}`}
                      className="v3-alert-link"
                    >
                      Voir la fiche de patient
                    </Link>
                  ) : (
                    <span
                      className="v3-alert-link"
                      style={{ color: "#888", textDecoration: "none" }}
                    >
                      Voir la fiche de patient
                    </span>
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
          {alertsInfo.length === 0 && !loading && (
            <p style={{ color: "#888", fontSize: "13px", marginTop: "10px" }}>
              Aucune alerte info
            </p>
          )}
          {alertsInfo.map((a, idx) => (
            <div key={idx} className="v3-alert-item">
              <div className="v3-alert-left">
                <div className="v3-alert-avatar">👤</div>
                <div className="v3-alert-info">
                  <span className="v3-alert-pname">{a.name}</span>
                  <span className="v3-alert-detail">{a.detail}</span>
                  {a.patientId ? (
                    <Link
                      to={`/cardiologue/patients/${a.patientId}`}
                      className="v3-alert-link"
                    >
                      Voir la fiche de patient
                    </Link>
                  ) : (
                    <span
                      className="v3-alert-link"
                      style={{ color: "#888", textDecoration: "none" }}
                    >
                      Voir la fiche de patient
                    </span>
                  )}
                </div>
              </div>
              <span className="v3-alert-time">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </MedicalLayout>
  );
}

export default CardiologueDashboard;
