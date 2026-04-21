import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { navItems, doctorInfo } from "../../constants/medical";
import { apiGet, apiPut, apiPost } from "../../utils/api";
import { formatDate } from "../../utils/date";
import InteractiveECG from "../../components/medical/InteractiveECG";
import "./EcgInbox.css";

/* ─── Mini ECG Graph ──────────────────────────────────────────────── */
function MiniECGGraph({ data, color = "#2563eb" }) {
  if (!data || data.length === 0) {
    return (
      <svg viewBox="0 0 400 60" width="100%" height="60" preserveAspectRatio="none">
        <text x="50%" y="55%" textAnchor="middle" fill="#cbd5e1" fontSize="10">
          Pas de tracé
        </text>
      </svg>
    );
  }
  const step = Math.max(1, Math.floor(data.length / 400));
  const sampled = data.filter((_, i) => i % step === 0).slice(0, 400);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  const pts = sampled.map((v, i) => `${i},${60 - ((v - min) / range) * 50}`).join(" ");
  return (
    <svg viewBox={`0 0 ${sampled.length} 60`} width="100%" height="60" preserveAspectRatio="none">
      <rect width="100%" height="100%" fill="#fff9f9" />
      <polyline fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

/* ─── Score Ring ──────────────────────────────────────────────────── */
function ScoreRing({ score }) {
  const r = 22, circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <svg width={60} height={60} viewBox="0 0 60 60">
      <circle cx={30} cy={30} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6} />
      <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x={30} y={35} textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>
        {score}
      </text>
    </svg>
  );
}

/* ─── Composant Simulation Modal ─────────────────────────────────── */
function SimulateModal({ isOpen, onClose, patients, onSimulated }) {
  const [selectedPatient, setSelectedPatient] = useState("");
  const [riskLevel, setRiskLevel] = useState("faible");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  // Generate realistic ECG signal based on risk
  const generateECGSignal = (risk) => {
    const pts = [];
    const baseLength = 1250; // 5 seconds at 250Hz
    for (let i = 0; i < baseLength; i++) {
      const t = i / 250;
      const hr = risk === "critique" ? 145 : risk === "modere" ? 95 : 72;
      const period = 60 / hr;
      const phase = (t % period) / period;

      // Basic PQRST waveform
      let v = 0;
      if (phase < 0.1) v = 0.1 * Math.sin(Math.PI * phase / 0.1);         // P
      else if (phase < 0.25) v = -0.1 + (phase - 0.1) * (-1 / 0.05);      // Q (dip)
      else if (phase < 0.3) v = -0.1 + (phase - 0.25) * (15);             // R (spike)
      else if (phase < 0.35) v = 1.2 - (phase - 0.3) * 20;                // R-S
      else if (phase < 0.5) v = -0.15 * Math.sin(Math.PI * (phase - 0.35) / 0.15); // S-T
      else if (phase < 0.7) v = 0.15 * Math.sin(Math.PI * (phase - 0.5) / 0.2);   // T

      // Add noise/arrhythmia for risk levels
      const noise = (Math.random() - 0.5) * (risk === "critique" ? 0.35 : 0.08);
      pts.push(parseFloat((v + noise).toFixed(3)));
    }
    return pts;
  };

  const handleSimulate = async () => {
    if (!selectedPatient) return;
    setLoading(true);

    const type = riskLevel === "faible" ? "normal" : riskLevel === "modere" ? "modéré" : "critique";
    const pSignal = [];
    const pointsCount = 1000;
    const isAnomaly = type !== "normal";
    
    // XAI Heatmap: importance scores (0..1)
    const xaiHeatmap = new Array(pointsCount).fill(0);

    for (let i = 0; i < pointsCount; i++) {
      let val = 0;
      const x = i % 250;
      
      // P wave
      if (x > 40 && x < 60) val += 0.15 * Math.sin((x - 40) * Math.PI / 20);
      
      // QRS Complex
      if (x >= 95 && x <= 105) {
        const qrsType = (isAnomaly && Math.random() > 0.5) ? "wide" : "normal";
        if (qrsType === "wide") {
          // Simulate PVC (wide complex)
          val += 1.0 * Math.sin((x - 90) * Math.PI / 20);
          // Highlight anomaly in heatmap
          for(let k=i-10; k<i+10; k++) if(k>=0 && k<pointsCount) xaiHeatmap[k] = 0.8 + Math.random()*0.2;
        } else {
          val += 1.0 * Math.sin((x - 95) * Math.PI / 10);
        }
      }
      
      // T wave
      if (x > 160 && x < 200) val += 0.25 * Math.sin((x - 160) * Math.PI / 40);
      
      pSignal.push(val + (Math.random() - 0.5) * 0.05);
    }

    const iaData = {
      scoreRisque: type === "critique" ? 85 : type === "modéré" ? 45 : 12,
      detailedClassification: {
        normal: type === "normal" ? 0.95 : 0.05,
        pvc: type === "critique" ? 0.88 : (type === "modéré" ? 0.4 : 0.02),
        sveb: type === "modéré" ? 0.3 : 0.01,
        fusion: 0.01,
        unclassified: 0.01
      },
      resumeIA: type === "critique"
        ? "⚠️ Suspicion forte de PVC (Extrasystoles Ventriculaires) avec complexes larges détectés."
        : type === "modéré"
          ? "Observation d'arythmies supraventriculaires isolées."
          : "Rythme sinusal normal sans anomalie majeure.",
      xaiHeatmap: xaiHeatmap
    };

    try {
      const res = await apiPost("/ecg/record", {
        patientId: selectedPatient,
        signalData: pSignal,
        frequenceEchantillonnage: 250,
        source: "simulation",
        iaInterpretations: iaData,
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setSelectedPatient("");
          setRiskLevel("faible");
          onSimulated();
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const colors = { faible: "#22c55e", modere: "#f59e0b", critique: "#ef4444" };
  const labels = { faible: "Normal (Score < 40)", modere: "Modéré (Score 40-70)", critique: "Critique (Score > 70)" };

  return (
    <div className="sim-overlay" onClick={onClose}>
      <div className="sim-box" onClick={(e) => e.stopPropagation()}>
        <div className="sim-header">
          <div>
            <h2 className="sim-title">🔬 Simuler un ECG reçu</h2>
            <p className="sim-sub">Génère un tracé ECG avec analyse IA simulée</p>
          </div>
          <button className="sim-close" onClick={onClose}>✕</button>
        </div>

        {success ? (
          <div className="sim-success">
            <span style={{ fontSize: "3rem" }}>✅</span>
            <p>ECG simulé créé avec succès !</p>
            <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Fermeture automatique...</p>
          </div>
        ) : (
          <div className="sim-form">
            <div className="sim-field">
              <label className="sim-label">Patient</label>
              <select
                className="sim-select"
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
              >
                <option value="">— Choisir un patient —</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nom} {p.prenom} ({p.age} ans)
                  </option>
                ))}
              </select>
            </div>

            <div className="sim-field">
              <label className="sim-label">Niveau de risque simulé</label>
              <div className="sim-risk-group">
                {["faible", "modere", "critique"].map((r) => (
                  <button
                    key={r}
                    className={`sim-risk-btn ${riskLevel === r ? "active" : ""}`}
                    style={{ "--risk-color": colors[r] }}
                    onClick={() => setRiskLevel(r)}
                  >
                    <span className="sim-risk-dot" style={{ background: colors[r] }} />
                    {labels[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="sim-preview">
              <span className="sim-preview-label">🩺 Interprétation IA générée :</span>
              <p className="sim-preview-text">
                {riskLevel === "faible" && "Rythme sinusal normal. Aucune anomalie."}
                {riskLevel === "modere" && "Tachycardie + arythmies isolées. Surveillance recommandée."}
                {riskLevel === "critique" && "⚠️ Fibrillation auriculaire + anomalie ST — Intervention urgente."}
              </p>
            </div>

            <div className="sim-footer">
              <button className="sim-btn-cancel" onClick={onClose} disabled={loading}>Annuler</button>
              <button
                className="sim-btn-go"
                onClick={handleSimulate}
                disabled={loading || !selectedPatient}
              >
                {loading ? "Génération..." : "🚀 Créer l'ECG simulé"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Composant Principal ────────────────────────────────────────── */
export default function EcgInbox() {
  const navigate = useNavigate();
  const [ecgs, setEcgs] = useState([]);
  const [allEcgs, setAllEcgs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [filter, setFilter] = useState("pending"); // "pending" | "all"
  const [search, setSearch] = useState("");
  const [selectedEcg, setSelectedEcg] = useState(null);

  const handlePatientClick = (pid) => {
    localStorage.setItem("activePatientId", pid);
    navigate("/cardiologue/patients/fichepatient");
  };

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const [ecgRes, patientsRes] = await Promise.all([
        apiGet("/ecg/all"),
        apiGet("/patients"),
      ]);

      if (ecgRes.ok) {
        const data = await ecgRes.json();
        setAllEcgs(data);
        const pending = data
          .filter((e) => e.decisionIA === "en_attente")
          .sort((a, b) => (b.iaInterpretations?.scoreRisque || 0) - (a.iaInterpretations?.scoreRisque || 0));
        setEcgs(pending);
      }
      if (patientsRes.ok) {
        setPatients(await patientsRes.json());
      }
    } catch (err) {
      console.error("Inbox fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  const handleReview = async (id, decision) => {
    try {
      const res = await apiPut(`/ecg/${id}/review`, { decisionIA: decision });
      if (res.ok) {
        setEcgs((prev) => prev.filter((e) => e._id !== id));
        setAllEcgs((prev) =>
          prev.map((e) => e._id === id ? { ...e, decisionIA: decision } : e)
        );
      }
    } catch (err) {
      console.error("Review error:", err);
    }
  };

  const getRiskConfig = (score) => {
    if (score >= 70) return { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", label: "CRITIQUE", icon: "🚨" };
    if (score >= 40) return { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "MODÉRÉ", icon: "⚠️" };
    return { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", label: "FAIBLE", icon: "✅" };
  };

  const displayed = (filter === "pending" ? ecgs : allEcgs).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.patient?.nom?.toLowerCase().includes(q) || e.patient?.prenom?.toLowerCase().includes(q);
  });

  const critiques = ecgs.filter((e) => (e.iaInterpretations?.scoreRisque || 0) >= 70).length;

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Boîte ECG",
  }));

  return (
    <MedicalLayout breadcrumb="Boîte ECG / À réviser" navItems={themedNavItems} doctorInfo={doctorInfo}>
      <div className="cdash-center ecg-inbox-page">

        {/* ── Header ── */}
        <div className="inbox-header">
          <div>
            <h1 className="inbox-page-title">📟 Boîte de réception ECG</h1>
            <p className="inbox-page-sub">File d'attente des tracés nécessitant une vérification manuelle prioritaire</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button className="inbox-btn-simulate" onClick={() => setIsSimOpen(true)}>
              🔬 Simuler un ECG
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="inbox-stats-bar">
          <div className="inbox-stat-pill" style={{ background: "#f1f5f9", color: "#475569" }}>
            ⏱️ En attente : <strong>{ecgs.length}</strong>
          </div>
          <div className="inbox-stat-pill" style={{ background: "#f1f5f9", color: "#475569" }}>
            📁 Total : <strong>{allEcgs.length}</strong>
          </div>
          {critiques > 0 && (
            <div className="inbox-stat-pill" style={{ background: "#fef2f2", color: "#ef4444" }}>
              🚨 Critiques : <strong>{critiques}</strong>
            </div>
          )}
        </div>

        {/* ── Toolbar ── */}
        <div className="inbox-toolbar">
          <div className="inbox-search-wrap">
            <span className="inbox-search-icon">🔍</span>
            <input
              className="inbox-search-input"
              placeholder="Rechercher par patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="inbox-filter-group">
            <button
              className={`inbox-filter-btn ${filter === "pending" ? "active" : ""}`}
              onClick={() => setFilter("pending")}
            >
              ⏳ En attente ({ecgs.length})
            </button>
            <button
              className={`inbox-filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              📋 Tous ({allEcgs.length})
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="inbox-empty" style={{ padding: "80px 0" }}>
            <div className="cdash-spinner" style={{ margin: "0 auto 20px" }} />
            <p>Récupération des tracés ECG...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="inbox-empty">
            <div className="inbox-empty-icon">{filter === "pending" ? "🎉" : "📋"}</div>
            <h3>{filter === "pending" ? "Boîte de réception vide" : "Aucun ECG"}</h3>
            <p>{filter === "pending"
              ? "Tous les ECG ont été révisés. Excellent travail !"
              : "Aucun tracé ECG enregistré."}
            </p>
            {filter === "pending" && (
              <button className="inbox-btn-simulate" style={{ marginTop: "1rem" }} onClick={() => setIsSimOpen(true)}>
                🔬 Simuler un ECG reçu
              </button>
            )}
          </div>
        ) : (
          <div className="inbox-list">
            {displayed.map((ecg) => {
              const score = ecg.iaInterpretations?.scoreRisque || 0;
              const risk = getRiskConfig(score);
              const isReviewed = ecg.decisionIA !== "en_attente";

              return (
                <div
                  key={ecg._id}
                  className={`inbox-card ${isReviewed ? "inbox-card--reviewed" : ""}`}
                  style={{ borderLeftColor: risk.color }}
                >
                  {/* Top */}
                  <div className="inbox-card-top">
                    <div className="inbox-card-patient">
                      <div className="inbox-avatar" style={{ background: risk.bg, color: risk.color }}>
                        {ecg.patient?.nom?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="inbox-patient-info">
                        <h3>{ecg.patient?.nom} {ecg.patient?.prenom || ""}</h3>
                        <p>{ecg.patient?.age} ans • Reçu le {formatDate(ecg.createdAt)}</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <ScoreRing score={score} />
                      <div>
                        <div className="inbox-risk-badge" style={{ background: risk.bg, color: risk.color, borderColor: risk.border }}>
                          {risk.icon} {risk.label} — {score}/100
                        </div>
                        {isReviewed && (
                          <div className={`inbox-decision-badge inbox-decision--${ecg.decisionIA}`}>
                            {ecg.decisionIA === "confirmé" && "✓ Risque confirmé"}
                            {ecg.decisionIA === "rejeté" && "✗ Fausse alerte"}
                            {ecg.decisionIA === "corrigé" && "✏️ Corrigé"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* IA Flags */}
                  {ecg.iaInterpretations && (
                    <div className="inbox-flags">
                      {/* Predominant Class Badge */}
                      {(() => {
                        const probas = ecg.iaInterpretations.detailedClassification || {};
                        if (probas.pvc > 0.5) return <span className="inbox-flag inbox-flag--red">🩺 PVC (Extrasystole V.)</span>;
                        if (probas.sveb > 0.5) return <span className="inbox-flag inbox-flag--orange">🩺 SVEB (Ectopie SV.)</span>;
                        if (probas.fusion > 0.5) return <span className="inbox-flag inbox-flag--orange">🩺 Rythme de Fusion</span>;
                        return null;
                      })()}
                      
                      {ecg.iaInterpretations.arythmie && <span className="inbox-flag inbox-flag--red">⚡ Arythmie</span>}
                      {ecg.iaInterpretations.fibrillationAuriculaire && <span className="inbox-flag inbox-flag--red">🔴 Fibrillation A.</span>}
                      {ecg.iaInterpretations.tachycardie && <span className="inbox-flag inbox-flag--orange">⚠️ Tachycardie</span>}
                      {ecg.iaInterpretations.anomalieST && <span className="inbox-flag inbox-flag--orange">📉 Anomalie ST</span>}
                    </div>
                  )}

                  {/* ECG Trace + AI Summary */}
                  <div className="inbox-card-middle">
                    <div className="inbox-ai-summary" style={{ borderLeftColor: risk.color }}>
                      <h4 style={{ color: risk.color, margin: "0 0 6px", fontSize: "0.8rem" }}>
                        🤖 Résumé IA
                      </h4>
                      <p style={{ margin: 0, color: "#374151", fontSize: "0.83rem", lineHeight: 1.5 }}>
                        {ecg.iaInterpretations?.resumeIA || "Analyse IA non disponible."}
                      </p>
                    </div>

                    <div className="inbox-graph-wrap">
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: "5px" }}>
                        Aperçu du tracé
                      </div>
                      <MiniECGGraph data={ecg.signalData} color={risk.color} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="inbox-card-bottom">
                      <button
                        className="inbox-btn inbox-btn-profile"
                        onClick={() => setSelectedEcg(ecg)}
                      >
                        📊 Analyser (XAI)
                      </button>
                      <button
                        className="inbox-btn inbox-btn-profile"
                        style={{ marginLeft: '5px' }}
                        onClick={() => handlePatientClick(ecg.patient?._id)}
                      >
                        👤 Profil
                      </button>

                    {!isReviewed ? (
                      <div className="inbox-actions-right">
                        <button
                          className="inbox-btn inbox-btn-reject"
                          onClick={() => handleReview(ecg._id, "rejeté")}
                        >
                          ✗ Fausse alerte
                        </button>
                        <button
                          className="inbox-btn inbox-btn-confirm"
                          onClick={() => handleReview(ecg._id, "confirmé")}
                        >
                          ✓ Confirmer risque
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                        ECG déjà révisé
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Detail View (XAI Overlay) ── */}
      {selectedEcg && (
        <div className="ecg-fullscreen-overlay" onClick={() => setSelectedEcg(null)}>
          <div className="ecg-fullscreen-content" onClick={e => e.stopPropagation()}>
            <div className="fullscreen-header">
              <h2>Analyse IA & XAI : ECG #{selectedEcg._id.slice(-6)}</h2>
              <button className="inbox-btn-close" onClick={() => setSelectedEcg(null)}>✕</button>
            </div>
            
            <div className="fullscreen-visu" style={{ height: "400px" }}>
              <InteractiveECG 
                points={selectedEcg.signalData} 
                sampleRate={selectedEcg.frequenceEchantillonnage} 
                heatmap={selectedEcg.iaInterpretations?.xaiHeatmap || []} 
              />
            </div>
            
            <div className="fullscreen-footer">
              <div className="footer-ia-info">
                <p><strong>Note Clinique IA :</strong> {selectedEcg.iaInterpretations?.resumeIA}</p>
                <div className="xai-legend">
                  <span className="legend-dot"></span> Zones rouges = Importance Grad-CAM (Zones ayant influencé le modèle)
                </div>
              </div>
              <div className="footer-actions">
                <button className="inbox-btn-confirm" onClick={() => { handleReview(selectedEcg._id, "confirmé"); setSelectedEcg(null); }}>
                  ✓ Confirmer Diagnostic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SimulateModal
        isOpen={isSimOpen}
        onClose={() => setIsSimOpen(false)}
        patients={patients}
        onSimulated={fetchInbox}
      />
    </MedicalLayout>
  );
}
