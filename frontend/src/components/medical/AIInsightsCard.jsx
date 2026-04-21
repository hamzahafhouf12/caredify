import React from "react";
import "./AIInsightsCard.css";

// ─── Données cliniques enrichies par type d'anomalie ───────────────────────
export const CLINICAL_DATA = {
  arythmie: {
    label: "Arythmie",
    severity: "high",
    icon: "⚡",
    desc: "Irrégularité du rythme cardiaque détectée par le modèle SG1.",
    explanation:
      "Le signal ECG présente une variabilité anormale des intervalles RR, signe d'une dépolarisation auriculaire ou ventriculaire irrégulière. Peut indiquer une extrasystole, un bloc de branche ou une arythmie supra-ventriculaire.",
    recommendation:
      "Surveillance continue du rythme. Holter-ECG 24h recommandé.",
  },
  fibrillationAuriculaire: {
    label: "Fibrillation Auriculaire",
    severity: "critical",
    icon: "🔴",
    desc: "Activité auriculaire chaotique sans onde P régulière identifiée.",
    explanation:
      "Absence d'ondes P bien définies, rythme ventriculaire irrégulier et trémulation de la ligne de base. La FA multiplie par 5 le risque d'AVC. Anti-coagulation à évaluer selon le score CHA₂DS₂-VASc.",
    recommendation:
      "Consultation urgente. Évaluation anti-coagulante immédiate.",
  },
  anomalieST: {
    label: "Anomalie Segment ST",
    severity: "critical",
    icon: "📉",
    desc: "Décalage du segment ST détecté — possible ischémie myocardique.",
    explanation:
      "Le segment ST présente un sous-décalage ou sus-décalage dépassant 1 mm dans au moins deux dérivations contiguës. Ce pattern est évocateur d'une ischémie aiguë ou d'un syndrome coronarien. Une cardioprotection et des enzymes cardiaques (troponine) sont indiqués.",
    recommendation:
      "Urgence cardiologique. Enzymes cardiaques + coronarographie à discuter.",
  },
  insuffisanceCardiaque: {
    label: "Insuffisance Cardiaque",
    severity: "high",
    icon: "🫀",
    desc: "Signes électriques évocateurs d'une fatigue ventriculaire.",
    explanation:
      "Présence de modifications de la morphologie QRS (élargissement) et/ou du rapport R/S péjoratif dans les dérivations précordiales. Le retard conduction associé à une dilatation de cavité peut refléter une dysfonction systolique.",
    recommendation:
      "Échocardiographie. Bilan NTpro-BNP. Optimisation du traitement.",
  },
  tachycardie: {
    label: "Tachycardie",
    severity: "moderate",
    icon: "⬆️",
    desc: "Fréquence cardiaque élevée (> 100 bpm) à l'analyse.",
    explanation:
      "La fréquence ventriculaire dépasse 100 bpm avec des intervalles RR courts. Peut être sinusale (réactionnelle : fièvre, anémie, déshydratation) ou supra-ventriculaire (TSV, flutter). Distinguer la cause est essentiel.",
    recommendation:
      "Identifier et traiter la cause. Vagotonie / beta-bloquants selon l'étiologie.",
  },
  bradycardie: {
    label: "Bradycardie",
    severity: "moderate",
    icon: "⬇️",
    desc: "Fréquence cardiaque basse (< 60 bpm) détectée.",
    explanation:
      "Ralentissement du rythme de base. Peut être physiologique (athlète, sommeil) ou pathologique (dysfonction sinusale, bloc auriculo-ventriculaire, médicaments bradycardisants). La tolérance hémodynamique doit être évaluée.",
    recommendation:
      "Bilan ECH (bloc AV ?). Review médicamenteux. Pace-maker si symptomatique.",
  },
  hrvFaible: {
    label: "HRV Faible",
    severity: "moderate",
    icon: "📊",
    desc: "Baisse de la variabilité de la fréquence cardiaque (HRV < seuil).",
    explanation:
      "Une HRV basse traduit une réduction du tonus parasympathique et une prédominance sympathique, associée à un stress cardiaque chronique, une dysautonomie ou un risque accru d'arythmie. C'est un marqueur pronostique indépendant de mortalité cardiovasculaire.",
    recommendation:
      "Suivi HRV longitudinal. Réduction du stress. Réévaluation à 48–72h.",
  },
};

const SEVERITY_CONFIG = {
  critical: {
    label: "Critique",
    color: "#eb5757",
    bg: "#fff0f0",
    dot: "#eb5757",
  },
  high: { label: "Élevé", color: "#f2994a", bg: "#fff8f0", dot: "#f2994a" },
  moderate: {
    label: "Modéré",
    color: "#f2c94c",
    bg: "#fffdf0",
    dot: "#e6ac00",
  },
  low: { label: "Faible", color: "#27ae60", bg: "#f0faf4", dot: "#27ae60" },
};

const DECISION_CONFIG = {
  en_attente: { label: "En attente", color: "#ff9800", bg: "#fff4e5" },
  confirmé: { label: "Confirmé ✓", color: "#2e7d32", bg: "#edf7ed" },
  rejeté: { label: "Rejeté ✗", color: "#d32f2f", bg: "#fdeded" },
  corrigé: { label: "Corrigé ✎", color: "#7b1fa2", bg: "#f5e9ff" },
};

// ─── Composant : Une seule constatation IA ─────────────────────────────────
function FindingItem({ finding, index }) {
  const [expanded, setExpanded] = React.useState(false);
  const cfg = finding.severityConfig;

  return (
    <div
      className={`ai-finding-item ai-finding-item--${finding.severity}`}
      style={{ borderLeftColor: cfg.color, animationDelay: `${index * 80}ms` }}
    >
      <div className="ai-finding-header" onClick={() => setExpanded(!expanded)}>
        <div className="ai-finding-left">
          <span className="ai-finding-icon">{finding.icon}</span>
          <div>
            <strong className="ai-finding-label">{finding.label}</strong>
            <p className="ai-finding-short">{finding.desc}</p>
          </div>
        </div>
        <div className="ai-finding-right">
          <span
            className="ai-severity-badge"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            {cfg.label}
          </span>
          <span className="ai-expand-arrow">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="ai-finding-detail">
          <div className="ai-clinical-box">
            <h5>📋 Explication clinique</h5>
            <p>{finding.explanation}</p>
          </div>
          <div className="ai-recommendation-box">
            <h5>💡 Recommandation</h5>
            <p>{finding.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant Principal ────────────────────────────────────────────────────
const AIInsightsCard = ({
  interpretations,
  decision,
  onReview,
  loading,
  annotationInitial,
  onSaveAnnotation,
}) => {
  const [localAnnotation, setLocalAnnotation] = React.useState(
    annotationInitial || "",
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [showCorrectForm, setShowCorrectForm] = React.useState(false);
  const [correction, setCorrection] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("findings"); // 'findings' | 'annotations'

  React.useEffect(() => {
    setLocalAnnotation(annotationInitial || "");
  }, [annotationInitial]);

  if (!interpretations) {
    return (
      <div className="ai-insights-card ai-insights-card--empty">
        <div className="ai-badge">SG1 AI ENGINE v2.0</div>
        <p className="ai-no-ecg">
          Aucune donnée ECG disponible pour ce patient.
        </p>
      </div>
    );
  }

  const {
    arythmie,
    fibrillationAuriculaire,
    anomalieST,
    insuffisanceCardiaque,
    tachycardie,
    bradycardie,
    hrvFaible,
    scoreRisque,
    resumeIA,
  } = interpretations;

  // Construire la liste des findings actifs
  const activeKeys = {
    arythmie,
    fibrillationAuriculaire,
    anomalieST,
    insuffisanceCardiaque,
    tachycardie,
    bradycardie,
    hrvFaible,
  };
  const findings = Object.entries(activeKeys)
    .filter(([, val]) => val)
    .map(([key]) => ({
      ...CLINICAL_DATA[key],
      key,
      severityConfig: SEVERITY_CONFIG[CLINICAL_DATA[key].severity],
    }))
    .sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });

  const getRiskColor = (s) =>
    s >= 70 ? "#eb5757" : s >= 40 ? "#f2994a" : "#27ae60";
  const getRiskLabel = (s) =>
    s >= 70 ? "Élevé" : s >= 40 ? "Modéré" : "Faible";
  const riskPct = Math.min(100, Math.max(0, scoreRisque || 0));
  const decisionConf = DECISION_CONFIG[decision] || DECISION_CONFIG.en_attente;

  const handleSave = () => {
    onSaveAnnotation(localAnnotation);
    setIsEditing(false);
  };

  const handleCorrect = () => {
    if (correction.trim()) {
      onSaveAnnotation(correction);
      onReview("corrigé");
      setShowCorrectForm(false);
      setCorrection("");
    }
  };

  return (
    <div className="ai-insights-card">
      {/* ── En-tête ── */}
      <div className="ai-insights-header">
        <div className="ai-header-top">
          <div className="ai-badge">SG1 AI ENGINE v2.0</div>
          <span
            className="ai-decision-badge"
            style={{ color: decisionConf.color, background: decisionConf.bg }}
          >
            {decisionConf.label}
          </span>
        </div>

        {/* Score de risque */}
        <div className="ai-risk-block">
          <div className="ai-risk-label-row">
            <span className="ai-risk-label">Score de Risque SG1</span>
            <span
              className="ai-risk-value"
              style={{ color: getRiskColor(riskPct) }}
            >
              {riskPct}% — {getRiskLabel(riskPct)}
            </span>
          </div>
          <div className="ai-risk-bar-bg">
            <div
              className="ai-risk-bar-fill"
              style={{
                width: `${riskPct}%`,
                background: getRiskColor(riskPct),
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Résumé IA ── */}
      <div className="ai-resume">
        <span className="ai-resume-icon">🤖</span>
        <p>
          "
          {resumeIA ||
            "Analyse automatique du signal ECG en cours par le modèle SG1..."}
          "
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="ai-tabs">
        <button
          className={`ai-tab ${activeTab === "findings" ? "ai-tab--active" : ""}`}
          onClick={() => setActiveTab("findings")}
        >
          Résultats IA{" "}
          {findings.length > 0 && (
            <span className="ai-tab-count">{findings.length}</span>
          )}
        </button>
        <button
          className={`ai-tab ${activeTab === "annotations" ? "ai-tab--active" : ""}`}
          onClick={() => setActiveTab("annotations")}
        >
          Observations Médecin
        </button>
      </div>

      {/* ── Tab : Résultats IA ── */}
      {activeTab === "findings" && (
        <div className="ai-tab-content">
          <div className="ai-findings-list">
            {findings.length === 0 ? (
              <div className="no-findings-box">
                <span className="no-findings-icon">✅</span>
                <p>
                  Rythme sinusal normal — aucune anomalie détectée par le modèle
                  SG1.
                </p>
              </div>
            ) : (
              findings.map((f, i) => (
                <FindingItem key={f.key} finding={f} index={i} />
              ))
            )}
          </div>

          {/* ── Validation médicale ── */}
          <div className="ai-review-section">
            <p className="ai-review-title">Validation Médicale de l'Analyse</p>

            {decision === "en_attente" && !showCorrectForm && (
              <div className="review-actions">
                <button
                  className="btn-confirm"
                  onClick={() => onReview("confirmé")}
                  disabled={loading}
                  title="Confirmer les résultats du modèle IA"
                >
                  ✓ Confirmer
                </button>
                <button
                  className="btn-reject"
                  onClick={() => onReview("rejeté")}
                  disabled={loading}
                  title="Rejeter — analyse non pertinente"
                >
                  ✗ Rejeter
                </button>
                <button
                  className="btn-correct"
                  onClick={() => setShowCorrectForm(true)}
                  disabled={loading}
                  title="Corriger — ajouter une correction clinique"
                >
                  ✎ Corriger
                </button>
              </div>
            )}

            {/* Formulaire de correction */}
            {showCorrectForm && (
              <div className="correction-form">
                <label className="correction-label">
                  Votre correction clinique :
                </label>
                <textarea
                  value={correction}
                  onChange={(e) => setCorrection(e.target.value)}
                  placeholder="Ex : L'arythmie est d'origine vagale, non pathologique. Pas de traitement requis."
                  className="note-textarea"
                  rows={4}
                />
                <div className="note-editor-actions">
                  <button
                    className="btn-confirm"
                    onClick={handleCorrect}
                    disabled={!correction.trim() || loading}
                  >
                    Valider la Correction
                  </button>
                  <button
                    className="btn-cancel-note"
                    onClick={() => setShowCorrectForm(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Affichage décision finale */}
            {decision !== "en_attente" && (
              <div
                className="decision-result"
                style={{ borderColor: decisionConf.color }}
              >
                <span style={{ color: decisionConf.color, fontWeight: 700 }}>
                  {decisionConf.label}
                </span>
                <p
                  style={{ color: "#777", fontSize: "12px", margin: "4px 0 0" }}
                >
                  Décision médicale enregistrée.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab : Observations Médecin ── */}
      {activeTab === "annotations" && (
        <div className="ai-tab-content">
          <div className="doctor-annotations-section">
            <div className="annotations-header">
              <h4>📝 Commentaires & Annotations du Cardiologue</h4>
              {!isEditing && (
                <button
                  className="btn-edit-note"
                  onClick={() => setIsEditing(true)}
                >
                  {annotationInitial ? "✏️ Modifier" : "＋ Ajouter"}
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="note-editor">
                <textarea
                  value={localAnnotation}
                  onChange={(e) => setLocalAnnotation(e.target.value)}
                  placeholder="Ajouter vos observations cliniques, commentaires sur l'ECG ou notes thérapeutiques..."
                  className="note-textarea"
                  rows={6}
                />
                <div className="note-editor-actions">
                  <button
                    className="btn-save-note"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    💾 Sauvegarder
                  </button>
                  <button
                    className="btn-cancel-note"
                    onClick={() => {
                      setIsEditing(false);
                      setLocalAnnotation(annotationInitial || "");
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="note-display">
                {annotationInitial ? (
                  <>
                    <div className="note-doctor-tag">
                      Dr. — Annotation médicale
                    </div>
                    <p className="note-text">{annotationInitial}</p>
                  </>
                ) : (
                  <div className="no-note-placeholder">
                    <span className="no-note-icon">📋</span>
                    <p className="no-note">
                      Aucune observation ajoutée pour cet ECG.
                    </p>
                    <p className="no-note-hint">
                      Cliquez sur « Ajouter » pour annoter l'analyse.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsCard;
