import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import "./HistoriqueECG.css";

// ─── Données cliniques ─────────────────────────────────────────────
const ANOMALY_LABELS = {
  arythmie: { label: "Arythmie", icon: "⚡", color: "var(--color-warning)" },
  fibrillationAuriculaire: {
    label: "Fibrillation Aur.",
    icon: "🔴",
    color: "var(--color-danger)",
  },
  anomalieST: {
    label: "Anomalie ST",
    icon: "📉",
    color: "var(--color-danger)",
  },
  insuffisanceCardiaque: {
    label: "Insuf. Cardiaque",
    icon: "🫀",
    color: "var(--color-warning)",
  },
  tachycardie: {
    label: "Tachycardie",
    icon: "⬆️",
    color: "var(--color-warning)",
  },
  bradycardie: {
    label: "Bradycardie",
    icon: "⬇️",
    color: "var(--color-warning)",
  },
  hrvFaible: { label: "HRV Faible", icon: "📊", color: "var(--color-warning)" },
};

const DECISION_CONFIG = {
  en_attente: { label: "En attente", className: "hx-badge-pending" },
  confirmé: { label: "Confirmé", className: "hx-badge-confirmed" },
  rejeté: { label: "Rejeté", className: "hx-badge-rejected" },
  corrigé: { label: "Corrigé", className: "hx-badge-corrected" },
};

// ─── Composant mini-ECG SVG simulé ────────────────────────────────
function MiniECGGraph({ data, color = "var(--brand-primary)" }) {
  if (!data || data.length === 0) {
    // Tracé générique si pas de signal
    return (
      <svg
        viewBox="0 0 400 60"
        width="100%"
        height="70"
        className="historique-ecg-graph"
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points="0,30 20,30 25,20 30,30 35,30 40,10 45,50 50,30 65,30 70,25 75,30 80,30 90,30
                  120,30 125,20 130,30 135,30 140,5 145,55 150,30 165,30 170,20 175,30 180,30 190,30
                  220,30 225,20 230,30 235,30 240,10 245,50 250,30 265,30 270,25 275,30 280,30 290,30
                  320,30 325,20 330,30 335,30 340,5 345,55 350,30 365,30 370,20 375,30 380,30 400,30"
        />
      </svg>
    );
  }
  // Sous-échantillonner si signal trop long
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
      className="historique-ecg-graph"
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

// ─── Composant : Carte d'un ECG ───────────────────────────────────
function ECGCard({ ecg, onAnnotate }) {
  const [expanded, setExpanded] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState(
    ecg.annotationMedecin || "",
  );
  const [saving, setSaving] = useState(false);

  const ia = ecg.iaInterpretations || {};
  const detectedAnomalies = Object.entries(ANOMALY_LABELS).filter(
    ([key]) => ia[key],
  );
  const score = ia.scoreRisque || 0;
  const isCritical = score >= 70;
  const isWarning = score >= 40 && score < 70;

  const scoreClass = isCritical
    ? "hx-score-critical"
    : isWarning
      ? "hx-score-warning"
      : "hx-score-normal";
  const signalColor = isCritical
    ? "var(--color-danger)"
    : isWarning
      ? "var(--color-warning)"
      : "var(--color-success)";

  const decisionConf =
    DECISION_CONFIG[ecg.decisionIA] || DECISION_CONFIG.en_attente;

  const handleSaveAnnotation = async () => {
    setSaving(true);
    await onAnnotate(ecg._id, newAnnotation);
    setSaving(false);
    setAnnotating(false);
  };

  return (
    <div className={`hx-card ${expanded ? "hx-card--expanded" : ""}`}>
      {/* ── En-tête de la carte ── */}
      <div className="hx-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="hx-card-meta">
          <div className="hx-icon-circle">❤️</div>
          <div className="hx-card-meta-text">
            <span className="hx-card-date">
              {new Date(ecg.createdAt).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              à{" "}
              {new Date(ecg.createdAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="hx-card-source">
              Source: {ecg.source || "Dispositif Wearable"}
            </span>
          </div>
        </div>

        <div className="hx-card-signals">
          <div className={`hx-score-pill ${scoreClass}`}>
            IA Score: {score}%
          </div>
          <span className={`hx-decision-badge ${decisionConf.className}`}>
            {decisionConf.label}
          </span>
          <span className={`hx-expand-btn ${expanded ? "hx-expanded" : ""}`}>
            ▼
          </span>
        </div>
      </div>

      {/* ── Mini tracé ECG ── */}
      <div className="hx-graph-row">
        <MiniECGGraph data={ecg.signalData} color={signalColor} />
      </div>

      {/* ── Anomalies détectées ── */}
      <div className="hx-anomalies-row">
        {detectedAnomalies.length === 0 ? (
          <span className="hx-normal-tag">✅ Rythme sinusal normal</span>
        ) : (
          <div className="hx-tags-container">
            {detectedAnomalies.map(([key, conf]) => (
              <span key={key} className="hx-anomaly-tag">
                {conf.icon} {conf.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Détail expandable ── */}
      {expanded && (
        <div className="hx-detail">
          {/* Résumé IA */}
          {ia.resumeIA && (
            <div className="hx-ia-resume">
              <span className="hx-ia-icon">🤖</span>
              <div className="hx-ia-content">
                <strong>Analyse IA (SG1 Engine v2.0)</strong>
                <p>"{ia.resumeIA}"</p>
              </div>
            </div>
          )}

          {/* Infos techniques */}
          <div className="hx-detail-grid">
            {ia.tachycardie && (
              <div className="hx-detail-item">
                <strong>Tachycardie</strong>
                <p>
                  Fréquence &gt; 100 bpm détectée. Contrôle de la cause
                  recommandé.
                </p>
              </div>
            )}
            {ia.bradycardie && (
              <div className="hx-detail-item">
                <strong>Bradycardie</strong>
                <p>
                  Fréquence &lt; 60 bpm. Évaluer les médicaments
                  bradycardisants.
                </p>
              </div>
            )}
            {ia.arythmie && (
              <div className="hx-detail-item">
                <strong>Arythmie</strong>
                <p>Irrégularité des intervalles RR. Holter-ECG recommandé.</p>
              </div>
            )}
            {ia.fibrillationAuriculaire && (
              <div className="hx-detail-item">
                <strong>Fibrillation Auriculaire</strong>
                <p>Absence d'onde P régulière. Anti-coagulation à évaluer.</p>
              </div>
            )}
            {ia.anomalieST && (
              <div className="hx-detail-item">
                <strong>Anomalie ST</strong>
                <p>Possible ischémie myocardique. Bilan enzymatique urgent.</p>
              </div>
            )}
            {ia.insuffisanceCardiaque && (
              <div className="hx-detail-item">
                <strong>Insuf. Cardiaque</strong>
                <p>
                  Signes de dysfonction ventriculaire. Échocardiographie
                  recommandée.
                </p>
              </div>
            )}
            {ia.hrvFaible && (
              <div className="hx-detail-item">
                <strong>HRV Faible</strong>
                <p>
                  Réduction du tonus parasympathique. Marqueur pronostique
                  péjoratif.
                </p>
              </div>
            )}
          </div>

          {/* Annotation médecin */}
          <div className="hx-annotation-section">
            <div className="hx-annotation-header">
              <h5>📝 Annotation du Cardiologue</h5>
              {!annotating && (
                <button
                  className="cdash-link-action--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnnotating(true);
                  }}
                >
                  {ecg.annotationMedecin
                    ? "✏️ Modifier"
                    : "➕ Ajouter une note"}
                </button>
              )}
            </div>

            {annotating ? (
              <div onClick={(e) => e.stopPropagation()}>
                <textarea
                  className="hx-textarea"
                  value={newAnnotation}
                  onChange={(e) => setNewAnnotation(e.target.value)}
                  placeholder="Votre observation clinique sur cet ECG..."
                  rows={3}
                  autoFocus
                />
                <div className="hx-annotation-actions">
                  <button
                    className="inbox-btn inbox-btn-confirm"
                    onClick={handleSaveAnnotation}
                    disabled={saving}
                  >
                    {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
                  </button>
                  <button
                    className="inbox-btn"
                    style={{
                      background: "var(--bg-page)",
                      color: "var(--text-secondary)",
                    }}
                    onClick={() => setAnnotating(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <p className="hx-annotation-text">
                {ecg.annotationMedecin || (
                  <span className="hx-no-annotation">
                    Aucune annotation ajoutée pour le moment.
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Principale ──────────────────────────────────────────────
export default function HistoriqueECG() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient");

  const [ecgs, setEcgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDecision, setFilterDecision] = useState("all");
  const [searchText, setSearchText] = useState("");

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Signaux Vitaux", // Maintien de l'état actif sur le parent
  }));

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const token = localStorage.getItem("caredify_token");

  const fetchECGs = async () => {
    setLoading(true);
    setError("");
    try {
      // Pour les tests sans backend, on utilise un setTimeout si pas connecté
      const url = patientId
        ? `${API_URL}/ecg/patient/${patientId}`
        : `${API_URL}/ecg/all`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setEcgs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        "Impossible de se connecter au serveur pour charger l'historique.",
      );
      setEcgs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchECGs();
  }, [patientId]);

  const handleAnnotate = async (ecgId, annotation) => {
    try {
      const res = await fetch(`${API_URL}/ecg/${ecgId}/annotation`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ annotationMedecin: annotation }),
      });
      if (res.ok) {
        setEcgs((prev) =>
          prev.map((e) =>
            e._id === ecgId
              ? { ...e, annotationMedecin: annotation, revue: true }
              : e,
          ),
        );
      }
    } catch (err) {
      console.error("Annotation error:", err);
    }
  };

  // Filtrage
  const filtered = ecgs.filter((e) => {
    const matchDecision =
      filterDecision === "all" || e.decisionIA === filterDecision;
    const matchSearch =
      !searchText ||
      (e.iaInterpretations?.resumeIA || "")
        .toLowerCase()
        .includes(searchText.toLowerCase());
    return matchDecision && matchSearch;
  });

  const stats = {
    total: ecgs.length,
    pending: ecgs.filter((e) => e.decisionIA === "en_attente").length,
    confirmed: ecgs.filter((e) => e.decisionIA === "confirmé").length,
    critical: ecgs.filter((e) => (e.iaInterpretations?.scoreRisque || 0) >= 70)
      .length,
  };

  const breadcrumbText = patientId
    ? "Signaux Vitaux / Historique ECG (Patient)"
    : "Signaux Vitaux / Historique ECG Global";

  return (
    <MedicalLayout
      breadcrumb={breadcrumbText}
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="historique-page">
        {/* ── Header ── */}
        <div className="inbox-header" style={{ marginBottom: "1.5rem" }}>
          <div>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                margin: "0 0 4px",
                color: "var(--text-primary)",
              }}
            >
              Historique des Analyses ECG
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              Consultez et annotez les tracés ECG antérieurs traités par l'IA.
            </p>
          </div>

          <button
            className="inbox-btn"
            style={{
              background: "var(--bg-page)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)",
            }}
            onClick={() => window.history.back()}
          >
            ← Retour
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="hx-stats-row">
          <div className="hx-stat-card">
            <span className="hx-stat-value">{stats.total}</span>
            <span className="hx-stat-label">Total ECG</span>
          </div>
          <div className="hx-stat-card hx-stat-card--orange">
            <span className="hx-stat-value">{stats.pending}</span>
            <span className="hx-stat-label">En attente</span>
          </div>
          <div className="hx-stat-card hx-stat-card--green">
            <span className="hx-stat-value">{stats.confirmed}</span>
            <span className="hx-stat-label">Validés</span>
          </div>
          <div className="hx-stat-card hx-stat-card--red">
            <span className="hx-stat-value">{stats.critical}</span>
            <span className="hx-stat-label">Risque élevé</span>
          </div>
        </div>

        {/* ── Filtres ── */}
        <div className="hx-filters-panel">
          <div className="hx-search-container">
            <span className="hx-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher dans les résumés IA..."
              className="hx-search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="hx-filter-tabs">
            {[
              ["all", "Tous"],
              ["en_attente", "En attente"],
              ["confirmé", "Confirmés"],
              ["rejeté", "Rejetés"],
            ].map(([val, lbl]) => (
              <button
                key={val}
                className={`hx-filter-tab ${filterDecision === val ? "hx-filter-tab--active" : ""}`}
                onClick={() => setFilterDecision(val)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="historique-list">
          {loading && (
            <div className="hx-empty">
              <div className="hx-loading-spinner" />
              <p>Chargement de l'historique ECG...</p>
            </div>
          )}

          {!loading && error && (
            <div className="hx-empty">
              <span
                className="hx-empty-icon"
                style={{ color: "var(--color-danger)" }}
              >
                ⚠️
              </span>
              <p>{error}</p>
              <button
                className="inbox-btn inbox-btn-confirm"
                onClick={fetchECGs}
              >
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="hx-empty">
              <span className="hx-empty-icon">📊</span>
              <p>Aucun enregistrement ECG trouvé.</p>
              <span className="hx-empty-hint">
                Les analyses de ce patient seront répertoriées ici.
              </span>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.map((ecg) => (
              <ECGCard key={ecg._id} ecg={ecg} onAnnotate={handleAnnotate} />
            ))}
        </div>
      </div>
    </MedicalLayout>
  );
}
