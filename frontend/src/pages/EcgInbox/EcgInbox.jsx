import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { navItems, doctorInfo } from "../../constants/medical";
import "./EcgInbox.css";

// ─── Composant mini-ECG ──────────────────────────────────────────

function MiniECGGraph({ data, color = "#2f80ed" }) {
  if (!data || data.length === 0) {
    return (
      <svg
        viewBox="0 0 400 60"
        width="100%"
        height="70"
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke="#ccc"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points="0,30 400,30"
        />
      </svg>
    );
  }

  const step = Math.max(1, Math.floor(data.length / 400));
  const sampled = data.filter((_, i) => i % step === 0).slice(0, 400);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  const pts = sampled
    .map((v, i) => `${i},${60 - ((v - min) / range) * 50}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${sampled.length} 60`}
      width="100%"
      height="70"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

// ─── Composant Principal Boîte de Réception ECG ──────────────────

export default function EcgInbox() {
  const [ecgs, setEcgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // ─── Récupération et filtrage des données ───
  const fetchInbox = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("caredify_token");

      const res = await fetch(`${API_URL}/ecg/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();

        // Filtrer les ECG en attente de révision
        const pending = data.filter((ecg) => ecg.decisionIA === "en_attente");

        // Trier par score de risque décroissant
        const sorted = pending.sort((a, b) => {
          const scoreA = a.iaInterpretations?.scoreRisque || 0;
          const scoreB = b.iaInterpretations?.scoreRisque || 0;
          return scoreB - scoreA;
        });

        setEcgs(sorted);
      }
    } catch (err) {
      console.error(
        "Erreur lors de la récupération de la boîte de réception:",
        err,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Action sur un ECG (Confirmer/Rejeter) ───
  const handleReview = async (id, decision) => {
    try {
      const token = localStorage.getItem("caredify_token");
      const res = await fetch(`${API_URL}/ecg/${id}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decisionIA: decision }),
      });

      if (res.ok) {
        // Optimistic UI : supprimer la carte de la liste immédiatement
        setEcgs((prev) => prev.filter((ecg) => ecg._id !== id));
      }
    } catch (err) {
      console.error("Erreur lors de la révision de l'ECG:", err);
    }
  };

  // ─── Configuration de l'interface ───
  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Boîte ECG",
  }));

  const hasCriticalCases =
    ecgs.length > 0 && (ecgs[0].iaInterpretations?.scoreRisque || 0) >= 70;

  // Utilitaire pour déterminer la couleur selon le risque
  const getRiskConfig = (score) => {
    if (score >= 70)
      return { root: "#ef4444", bg: "#fef2f2", label: "CRITIQUE" };
    if (score >= 40) return { root: "#f59e0b", bg: "#fffbeb", label: "MODÉRÉ" };
    return { root: "#10b981", bg: "#ecfdf5", label: "FAIBLE" };
  };

  return (
    <MedicalLayout
      breadcrumb="Boîte ECG / À réviser"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center ecg-inbox-page">
        {/* En-tête de la page */}
        <div className="inbox-header">
          <div>
            <h1 className="fiche-header-title">Boîte de réception des ECG</h1>
            <p style={{ color: "#64748b", marginTop: "5px" }}>
              File d'attente des tracés nécessitant une vérification manuelle
              prioritaire.
            </p>
          </div>

          <div className="inbox-stats">
            <div
              className="inbox-stat-pill"
              style={{ background: "#f1f5f9", color: "#475569" }}
            >
              ⏱️ En attente: {ecgs.length}
            </div>
            {hasCriticalCases && (
              <div
                className="inbox-stat-pill"
                style={{ background: "#fef2f2", color: "#ef4444" }}
              >
                ⚠️ Cas Critiques Détectés
              </div>
            )}
          </div>
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div
            className="history-loader"
            style={{ textAlign: "center", padding: "100px 0" }}
          >
            <div
              className="cdash-spinner"
              style={{ margin: "0 auto 20px" }}
            ></div>
            <p>Récupération des tracés...</p>
          </div>
        ) : ecgs.length === 0 ? (
          <div className="inbox-empty">
            <div className="inbox-empty-icon">🎉</div>
            <h3>Boîte de réception vide</h3>
            <p>Tous les ECG ont été révisés. Excellent travail !</p>
          </div>
        ) : (
          <div className="inbox-list">
            {ecgs.map((ecg) => {
              const score = ecg.iaInterpretations?.scoreRisque || 0;
              const riskConfig = getRiskConfig(score);

              return (
                <div key={ecg._id} className="inbox-card">
                  {/* Partie Haute : Patient & Meta info */}
                  <div className="inbox-card-top">
                    <div className="inbox-card-patient">
                      <div className="inbox-avatar">👤</div>
                      <div className="inbox-patient-info">
                        <h3>{ecg.patient?.nom || "Patient Inconnu"}</h3>
                        <p>{ecg.patient?.email || "ID: " + ecg.patient?._id}</p>
                      </div>
                    </div>

                    <div className="inbox-card-meta">
                      <div
                        className="inbox-risk-badge"
                        style={{
                          background: riskConfig.bg,
                          color: riskConfig.root,
                          border: `1px solid ${riskConfig.root}44`,
                        }}
                      >
                        Niveau de Risque : {score}% ({riskConfig.label})
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        Reçu le{" "}
                        {new Date(ecg.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Partie Centrale : Résumé IA & Graphique */}
                  <div className="inbox-card-middle">
                    <div
                      className="inbox-ai-summary"
                      style={{ borderLeftColor: riskConfig.root }}
                    >
                      <h4 style={{ color: riskConfig.root }}>
                        Recommandation Systémique
                      </h4>
                      <p>
                        {ecg.iaInterpretations?.resumeAlerte ||
                          "Le réseau neuronal a détecté des anomalies justifiant une révision humaine (Alerte générique)."}
                      </p>
                    </div>

                    <div className="inbox-graph-wrap">
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#94a3b8",
                          marginBottom: "5px",
                        }}
                      >
                        Aperçu du Tracé (Lead I)
                      </div>
                      <MiniECGGraph
                        data={ecg.signalData}
                        color={riskConfig.root}
                      />
                    </div>
                  </div>

                  {/* Partie Basse : Actions */}
                  <div className="inbox-card-bottom">
                    <div className="inbox-actions-left">
                      <button
                        onClick={() =>
                          navigate(`/cardiologue/patients/${ecg.patient?._id}`)
                        }
                      >
                        Ouvrir le Profil Patient
                      </button>
                    </div>

                    <div className="inbox-actions-right">
                      <button
                        className="inbox-btn inbox-btn-reject"
                        onClick={() => handleReview(ecg._id, "rejeté")}
                      >
                        ✗ Fausse Alerte
                      </button>
                      <button
                        className="inbox-btn inbox-btn-confirm"
                        onClick={() => handleReview(ecg._id, "confirmé")}
                      >
                        ✓ Confirmer Risque
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MedicalLayout>
  );
}
