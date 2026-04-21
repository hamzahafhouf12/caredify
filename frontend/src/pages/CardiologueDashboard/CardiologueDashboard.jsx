import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import { apiGet } from "../../utils/api";
import { formatDate } from "../../utils/date";
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
  const navigate = useNavigate();

  const handlePatientClick = (pid) => {
    if (!pid) return;
    localStorage.setItem("activePatientId", pid);
    navigate("/cardiologue/patients/fichepatient");
  };

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
        const response = await apiGet("/dashboard/stats");
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
              {formatDate(new Date(), "fr-FR", {
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
                  <button
                    className="v3-btn-icon-link"
                    onClick={() => handlePatientClick(p._id)}
                    title="Voir la fiche"
                  >
                    ➔
                  </button>
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
                  <span className="v3-trend-val">
                    {stats.vitals.avgFrequenceCardiaque
                      ? `${stats.vitals.avgFrequenceCardiaque} bpm`
                      : <span style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight:500}}>Pas de données</span>}
                  </span>
                </div>
                {stats.vitals.trends.length >= 2 && (
                  <TrendChart data={stats.vitals.trends.map(t => t.hr)} color="#2563eb" />
                )}
              </div>
              <div className="v3-trend-item">
                <div className="v3-trend-meta">
                  <span className="v3-trend-label">Variabilité HRV</span>
                  <span className="v3-trend-val">
                    {stats.vitals.avgHrv
                      ? `${stats.vitals.avgHrv} ms`
                      : <span style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight:500}}>Pas de données</span>}
                  </span>
                </div>
                {stats.vitals.trends.length >= 2 && (
                  <TrendChart data={stats.vitals.trends.map(t => t.hrv)} color="#0ea5e9" />
                )}
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
              Dernier ECG
              {stats.dernierECG?.patient &&
                ` — ${stats.dernierECG.patient.nom} ${stats.dernierECG.patient.prenom}`}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {stats.dernierECG && (
                <span className="v3-ecg-time">
                  {formatTime(stats.dernierECG.createdAt)}
                </span>
              )}
              <Link to="/cardiologue/ecg-inbox" className="v3-link-blue" style={{ fontSize: "0.8rem" }}>
                Boîte ECG →
              </Link>
            </div>
          </div>

          {!stats.dernierECG ? (
            /* ── Pas d'ECG du tout ── */
            <div className="v3-ecg-empty">
              <span className="v3-ecg-empty-icon">📋</span>
              <p>Aucun tracé ECG récent reçu.</p>
              <Link to="/cardiologue/ecg-inbox" className="v3-link-blue" style={{ fontSize: "0.83rem" }}>
                Accéder à la boîte ECG →
              </Link>
            </div>
          ) : (
            <div>
              {/* ── Tracé SVG si disponible ── */}
              {stats.dernierECG.signalData?.length > 10 ? (
                <div className="v3-ecg-grid-container">
                  <svg viewBox="0 0 800 120" className="v3-ecg-trace-svg">
                    {/* ECG grid */}
                    <defs>
                      <pattern id="ecgGrid" width="40" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#fecaca" strokeWidth="0.4"/>
                      </pattern>
                      <pattern id="ecgGridLarge" width="200" height="100" patternUnits="userSpaceOnUse">
                        <rect width="200" height="100" fill="url(#ecgGrid)"/>
                        <path d="M 200 0 L 0 0 0 100" fill="none" stroke="#fca5a5" strokeWidth="0.8"/>
                      </pattern>
                    </defs>
                    <rect width="800" height="120" fill="#fff5f5"/>
                    <rect width="800" height="120" fill="url(#ecgGridLarge)"/>
                    <polyline
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={stats.dernierECG.signalData
                        .slice(0, 500)
                        .map((val, i) =>
                          `${(i / Math.min(stats.dernierECG.signalData.length - 1, 499)) * 800},${60 - val * 45}`
                        )
                        .join(" ")}
                    />
                  </svg>
                </div>
              ) : (
                /* ── Pas de signal mais il y a un enregistrement ── */
                <div className="v3-ecg-grid-container">
                  <div className="v3-ecg-nosignal">
                    <span>📡</span>
                    <p>Signal ECG non disponible dans cet enregistrement</p>
                  </div>
                </div>
              )}

              {/* ── Infos IA ── */}
              <div className="v3-ecg-ia-row">
                {/* Score risque */}
                {stats.dernierECG.iaInterpretations && (
                  <div className="v3-ecg-score-block">
                    <span className="v3-ecg-score-label">Score IA</span>
                    <span
                      className={`v3-ecg-score-val ${
                        (stats.dernierECG.iaInterpretations.scoreRisque || 0) >= 70
                          ? "v3-score--red"
                          : (stats.dernierECG.iaInterpretations.scoreRisque || 0) >= 40
                          ? "v3-score--orange"
                          : "v3-score--green"
                      }`}
                    >
                      {stats.dernierECG.iaInterpretations.scoreRisque ?? "—"}/100
                    </span>
                  </div>
                )}

                {/* Flags détectés */}
                <div className="v3-ecg-flags">
                  {stats.dernierECG.iaInterpretations?.arythmie && (
                    <span className="v3-ecg-flag v3-flag--red">⚡ Arythmie</span>
                  )}
                  {stats.dernierECG.iaInterpretations?.fibrillationAuriculaire && (
                    <span className="v3-ecg-flag v3-flag--red">🔴 Fibrillation A.</span>
                  )}
                  {stats.dernierECG.iaInterpretations?.tachycardie && (
                    <span className="v3-ecg-flag v3-flag--orange">⚠️ Tachycardie</span>
                  )}
                  {stats.dernierECG.iaInterpretations?.bradycardie && (
                    <span className="v3-ecg-flag v3-flag--orange">⚠️ Bradycardie</span>
                  )}
                  {stats.dernierECG.iaInterpretations?.anomalieST && (
                    <span className="v3-ecg-flag v3-flag--orange">📉 Anomalie ST</span>
                  )}
                  {/* Si aucun flag détecté */}
                  {stats.dernierECG.iaInterpretations &&
                    !stats.dernierECG.iaInterpretations.arythmie &&
                    !stats.dernierECG.iaInterpretations.fibrillationAuriculaire &&
                    !stats.dernierECG.iaInterpretations.tachycardie &&
                    !stats.dernierECG.iaInterpretations.bradycardie &&
                    !stats.dernierECG.iaInterpretations.anomalieST && (
                      <span className="v3-ecg-flag v3-flag--green">✅ Aucune anomalie détectée</span>
                    )}
                </div>

                {/* Décision */}
                <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                  <span
                    className={`v3-ecg-decision v3-decision--${stats.dernierECG.decisionIA || "en_attente"}`}
                  >
                    {stats.dernierECG.decisionIA === "confirmé" && "✓ Confirmé"}
                    {stats.dernierECG.decisionIA === "rejeté" && "✗ Rejeté"}
                    {stats.dernierECG.decisionIA === "corrigé" && "✏️ Corrigé"}
                    {(!stats.dernierECG.decisionIA || stats.dernierECG.decisionIA === "en_attente") &&
                      "⏳ En attente de révision"}
                  </span>
                </div>
              </div>

              {/* Résumé IA */}
              {stats.dernierECG.iaInterpretations?.resumeIA && (
                <div className="v3-ecg-resume">
                  <span className="v3-ecg-resume-label">🤖 Résumé IA :</span>
                  <span className="v3-ecg-resume-text">
                    {stats.dernierECG.iaInterpretations.resumeIA}
                  </span>
                </div>
              )}
            </div>
          )}
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
                      to="/cardiologue/patients/fichepatient"
                      onClick={() => handlePatientClick(a.patientId)}
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
                      to="/cardiologue/patients/fichepatient"
                      onClick={() => handlePatientClick(a.patientId)}
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
                      to="/cardiologue/patients/fichepatient"
                      onClick={() => handlePatientClick(a.patientId)}
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
