import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import { getSocket } from "../../utils/socket";
import "./Alertes.css";

// ─── Config de priorité → couleur ───────────────────────────────────────────
const PRIORITY_CONFIG = {
  Critique: {
    label: "Critique",
    color: "#eb5757",
    bg: "#fff0f0",
    border: "#eb5757",
    dot: "🔴",
    order: 0,
  },
  A_surveiller: {
    label: "Surveillance",
    color: "#f2994a",
    bg: "#fff8f0",
    border: "#f2994a",
    dot: "🟠",
    order: 1,
  },
  Normal: {
    label: "Normal",
    color: "#27ae60",
    bg: "#f0faf4",
    border: "#27ae60",
    dot: "🟢",
    order: 2,
  },
};

const STATUS_CONFIG = {
  en_attente: { label: "En attente", color: "#ff9800", bg: "#fff4e5" },
  validée: { label: "Validée", color: "#2e7d32", bg: "#edf7ed" },
  rejetée: { label: "Rejetée", color: "#d32f2f", bg: "#fdeded" },
  ignorée: { label: "Ignorée", color: "#9e9e9e", bg: "#f5f5f5" },
};

// ─── Carte détaillée d'une alerte ───────────────────────────────────────────
function AlertCard({
  alert,
  onToggleLue,
  onSaveAnnotation,
  onChangeStatut,
  isNew,
}) {
  const [expanded, setExpanded] = useState(isNew || false);
  const [annotation, setAnnotation] = useState(alert.annotationMedecin || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const pConf = PRIORITY_CONFIG[alert.priorite] || PRIORITY_CONFIG.Normal;
  const sConf = STATUS_CONFIG[alert.statut] || STATUS_CONFIG.en_attente;

  const handleSave = async () => {
    setSaving(true);
    await onSaveAnnotation(alert._id, annotation, alert.statut);
    setSaving(false);
    setEditing(false);
  };

  const handleStatut = async (statut) => {
    await onChangeStatut(alert._id, annotation, statut);
  };

  return (
    <div
      className={`alx-card alx-card--${alert.priorite === "Critique" ? "red" : alert.priorite === "A_surveiller" ? "orange" : "green"} ${!alert.lue ? "alx-card--unread" : ""} ${isNew ? "alx-card--new" : ""}`}
      style={{ borderLeftColor: pConf.border }}
    >
      {/* ── En-tête ── */}
      <div className="alx-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="alx-card-left">
          {/* Indicateur lecture */}
          {!alert.lue && <span className="alx-unread-dot" />}

          {/* Badge priorité */}
          <span
            className="alx-priority-badge"
            style={{
              color: pConf.color,
              background: pConf.bg,
              borderColor: pConf.border + "55",
            }}
          >
            {pConf.dot} {pConf.label}
          </span>

          {/* Patient */}
          <div
            className="alx-patient"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/cardiologue/patients/${alert.patient?._id}`);
            }}
          >
            <span className="alx-avatar">👤</span>
            <div>
              <span className="alx-patient-name">{alert.patient?.nom}</span>
              <span className="alx-patient-type">{alert.type}</span>
            </div>
          </div>
        </div>

        <div className="alx-card-right">
          <span
            className="alx-status-badge"
            style={{ color: sConf.color, background: sConf.bg }}
          >
            {sConf.label}
          </span>
          <span className="alx-source-tag">
            {alert.source === "ia"
              ? "🤖 IA"
              : alert.source === "device"
                ? "📡 Appareil"
                : "👨‍⚕️ Manuel"}
          </span>
          <span className="alx-date">
            {new Date(alert.createdAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <input
            type="checkbox"
            className="alx-checkbox"
            checked={alert.lue}
            onChange={(e) => {
              e.stopPropagation();
              onToggleLue(alert._id);
            }}
            onClick={(e) => e.stopPropagation()}
            title="Marquer comme traitée"
          />
          <span className="alx-expand">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Détail ── */}
      {expanded && (
        <div className="alx-card-detail">
          {/* Description */}
          <div
            className="alx-detail-box"
            style={{ borderColor: pConf.border + "44", background: pConf.bg }}
          >
            <span className="alx-detail-icon">{pConf.dot}</span>
            <div>
              <p className="alx-detail-label">Détail de l'alerte</p>
              <p className="alx-detail-text">{alert.detail}</p>
            </div>
          </div>

          {/* Actions de statut */}
          {alert.statut === "en_attente" && (
            <div className="alx-statut-actions">
              <p className="alx-statut-title">Action médicale :</p>
              <div className="alx-statut-btns">
                <button
                  className="alx-btn alx-btn--validate"
                  onClick={() => handleStatut("validée")}
                >
                  ✓ Valider
                </button>
                <button
                  className="alx-btn alx-btn--ignore"
                  onClick={() => handleStatut("ignorée")}
                >
                  — Ignorer
                </button>
                <button
                  className="alx-btn alx-btn--reject"
                  onClick={() => handleStatut("rejetée")}
                >
                  ✗ Rejeter
                </button>
              </div>
            </div>
          )}

          {/* Annotation médecin */}
          <div className="alx-annotation-section">
            <div className="alx-annotation-header">
              <h5>📝 Commentaire médical</h5>
              {!editing && (
                <button
                  className="alx-btn-text"
                  onClick={() => setEditing(true)}
                >
                  {alert.annotationMedecin ? "✏️ Modifier" : "+ Ajouter"}
                </button>
              )}
            </div>

            {editing ? (
              <div className="alx-annotation-editor">
                <textarea
                  className="alx-textarea"
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  placeholder="Votre observation clinique..."
                  rows={3}
                />
                <div className="alx-editor-actions">
                  <button
                    className="alx-btn alx-btn--save"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
                  </button>
                  <button
                    className="alx-btn alx-btn--cancel"
                    onClick={() => setEditing(false)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <p className="alx-annotation-text">
                {alert.annotationMedecin || (
                  <span className="alx-no-note">Aucun commentaire ajouté.</span>
                )}
              </p>
            )}
          </div>

          {/* Lien fiche patient */}
          <button
            className="alx-btn alx-btn--fiche"
            onClick={() =>
              navigate(`/cardiologue/patients/${alert.patient?._id}`)
            }
          >
            📄 Voir la fiche complète du patient
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page Principale ─────────────────────────────────────────────────────────
export default function Alertes() {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPriorite, setFilterPriorite] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [newAlertIds, setNewAlertIds] = useState(new Set());

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const token = localStorage.getItem("caredify_token");

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Alertes",
  }));

  // ── Chargement initial ──
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // Trier par priorité (Critique > A_surveiller > Normal) puis par date
      const sorted = data.sort((a, b) => {
        const order = { Critique: 0, A_surveiller: 1, Normal: 2 };
        const po = (order[a.priorite] ?? 3) - (order[b.priorite] ?? 3);
        if (po !== 0) return po;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setAlertes(sorted);
    } catch (err) {
      setError("Erreur lors du chargement des alertes.");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // ── Socket : alertes temps réel ──
  useEffect(() => {
    const socket = getSocket();
    socket.on("new_alert", (alert) => {
      setAlertes((prev) => {
        const updated = [alert, ...prev].sort((a, b) => {
          const order = { Critique: 0, A_surveiller: 1, Normal: 2 };
          return (order[a.priorite] ?? 3) - (order[b.priorite] ?? 3);
        });
        return updated;
      });
      setNewAlertIds((prev) => new Set([...prev, alert._id]));
      // Retirer le marqueur "nouveau" après 5s
      setTimeout(
        () =>
          setNewAlertIds((prev) => {
            const s = new Set(prev);
            s.delete(alert._id);
            return s;
          }),
        5000,
      );
    });
    return () => socket.off("new_alert");
  }, []);

  // ── Actions ──
  const toggleLue = async (id) => {
    const res = await fetch(`${API_URL}/alerts/${id}/trait`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok)
      setAlertes((prev) =>
        prev.map((a) => (a._id === id ? { ...a, lue: !a.lue } : a)),
      );
  };

  const saveAnnotation = async (id, text, statut) => {
    const res = await fetch(`${API_URL}/alerts/${id}/annotation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        annotationMedecin: text,
        statut: statut || "validée",
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAlertes((prev) => prev.map((a) => (a._id === id ? updated : a)));
    }
  };

  const changeStatut = async (id, annotation, statut) => {
    const res = await fetch(`${API_URL}/alerts/${id}/annotation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ annotationMedecin: annotation, statut }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAlertes((prev) => prev.map((a) => (a._id === id ? updated : a)));
    }
  };

  // ── Stats ──
  const stats = {
    critique: alertes.filter((a) => a.priorite === "Critique").length,
    surveillance: alertes.filter((a) => a.priorite === "A_surveiller").length,
    normal: alertes.filter((a) => a.priorite === "Normal").length,
    nonLues: alertes.filter((a) => !a.lue).length,
  };

  // ── Filtrage ──
  const filtered = alertes.filter((a) => {
    const matchP = filterPriorite === "all" || a.priorite === filterPriorite;
    const matchS = filterStatut === "all" || a.statut === filterStatut;
    const matchT =
      !searchText ||
      (a.detail || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (a.patient?.nom || "").toLowerCase().includes(searchText.toLowerCase());
    return matchP && matchS && matchT;
  });

  return (
    <MedicalLayout
      breadcrumb="Alertes"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center alx-page">
        {/* ── Titre ── */}
        <div className="alx-page-header">
          <h1 className="cdash-page-title">Alertes </h1>
          {stats.nonLues > 0 && (
            <span className="alx-unread-count">
              {stats.nonLues} non traitée{stats.nonLues > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Stats Cards ── */}
        <div className="alx-stats-row">
          <div className="alx-stat alx-stat--red">
            <span className="alx-stat-icon">🔴</span>
            <div>
              <span className="alx-stat-value">{stats.critique}</span>
              <span className="alx-stat-label">Critiques</span>
            </div>
          </div>
          <div className="alx-stat alx-stat--orange">
            <span className="alx-stat-icon">🟠</span>
            <div>
              <span className="alx-stat-value">{stats.surveillance}</span>
              <span className="alx-stat-label">Surveillance</span>
            </div>
          </div>
          <div className="alx-stat alx-stat--green">
            <span className="alx-stat-icon">🟢</span>
            <div>
              <span className="alx-stat-value">{stats.normal}</span>
              <span className="alx-stat-label">Normales</span>
            </div>
          </div>
          <div className="alx-stat alx-stat--blue">
            <span className="alx-stat-icon">🔔</span>
            <div>
              <span className="alx-stat-value">{stats.nonLues}</span>
              <span className="alx-stat-label">Non traitées</span>
            </div>
          </div>
        </div>

        {/* ── Légende couleurs ── */}
        <div className="alx-legend">
          <span className="alx-legend-item alx-legend-item--red">
            🔴 Rouge = Critique — action immédiate requise
          </span>
          <span className="alx-legend-item alx-legend-item--orange">
            🟠 Orange = Surveillance — à traiter prochainement
          </span>
          <span className="alx-legend-item alx-legend-item--green">
            🟢 Vert = Normal — information seule
          </span>
        </div>

        {/* ── Filtres ── */}
        <div className="alx-filters">
          <input
            type="text"
            className="alx-search"
            placeholder="🔍 Rechercher par patient ou description..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <div className="alx-filter-row">
            <div className="alx-filter-group">
              <span className="alx-filter-label">Priorité :</span>
              {[
                ["all", "Toutes"],
                ["Critique", "🔴 Critiques"],
                ["A_surveiller", "🟠 Surveillance"],
                ["Normal", "🟢 Normales"],
              ].map(([val, lbl]) => (
                <button
                  key={val}
                  className={`alx-filter-btn ${filterPriorite === val ? "alx-filter-btn--active" : ""}`}
                  onClick={() => setFilterPriorite(val)}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="alx-filter-group">
              <span className="alx-filter-label">Statut :</span>
              {[
                ["all", "Tous"],
                ["en_attente", "En attente"],
                ["validée", "Validées"],
                ["rejetée", "Rejetées"],
              ].map(([val, lbl]) => (
                <button
                  key={val}
                  className={`alx-filter-btn ${filterStatut === val ? "alx-filter-btn--active" : ""}`}
                  onClick={() => setFilterStatut(val)}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Liste alertes ── */}
        <div className="alx-list">
          {loading && (
            <div className="alx-state">
              <div className="alx-spinner" />
              <p>Chargement des alertes...</p>
            </div>
          )}

          {!loading && error && (
            <div className="alx-state alx-state--error">
              <span>⚠️</span>
              <p>{error}</p>
              <button className="alx-retry-btn" onClick={fetchAlerts}>
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="alx-state">
              <span style={{ fontSize: "2.5rem" }}>🔔</span>
              <p>Aucune alerte correspondante.</p>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.map((alert) => (
              <AlertCard
                key={alert._id}
                alert={alert}
                isNew={newAlertIds.has(alert._id)}
                onToggleLue={toggleLue}
                onSaveAnnotation={saveAnnotation}
                onChangeStatut={changeStatut}
              />
            ))}
        </div>
      </div>
    </MedicalLayout>
  );
}
