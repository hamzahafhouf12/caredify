import { useState } from "react";
import { apiPost } from "../../utils/api";
import "./VitauxModal.css";

const FIELDS = [
  {
    key: "frequenceCardiaque",
    label: "Fréquence Cardiaque",
    unit: "bpm",
    icon: "❤️",
    min: 30,
    max: 250,
    placeholder: "ex: 72",
    color: "#ef4444",
  },
  {
    key: "spo2",
    label: "Saturation SpO₂",
    unit: "%",
    icon: "🫁",
    min: 50,
    max: 100,
    placeholder: "ex: 98",
    color: "#3b82f6",
  },
  {
    key: "tensionSystolique",
    label: "Tension Systolique",
    unit: "mmHg",
    icon: "🩺",
    min: 60,
    max: 250,
    placeholder: "ex: 120",
    color: "#8b5cf6",
  },
  {
    key: "tensionDiastolique",
    label: "Tension Diastolique",
    unit: "mmHg",
    icon: "🩺",
    min: 30,
    max: 180,
    placeholder: "ex: 80",
    color: "#8b5cf6",
  },
  {
    key: "hrv",
    label: "Variabilité HRV",
    unit: "ms",
    icon: "📈",
    min: 0,
    max: 500,
    placeholder: "ex: 45",
    color: "#10b981",
  },
  {
    key: "temperature",
    label: "Température",
    unit: "°C",
    icon: "🌡️",
    min: 34,
    max: 42,
    placeholder: "ex: 37.2",
    color: "#f59e0b",
    step: 0.1,
  },
];

export default function VitauxModal({ isOpen, onClose, patientId, patientName, onSaved }) {
  const [form, setForm] = useState({
    frequenceCardiaque: "",
    spo2: "",
    tensionSystolique: "",
    tensionDiastolique: "",
    hrv: "",
    temperature: "",
    ecgNote: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare payload — only non-empty values converted to numbers
    const payload = { patientId, source: "manual" };
    let hasAtLeastOne = false;

    FIELDS.forEach(({ key }) => {
      const val = form[key];
      if (val !== "" && val !== null) {
        payload[key] = parseFloat(val);
        hasAtLeastOne = true;
      }
    });

    if (!hasAtLeastOne) {
      setError("Veuillez saisir au moins une valeur.");
      return;
    }
    if (form.ecgNote.trim()) payload.ecgNote = form.ecgNote.trim();

    setLoading(true);
    setError("");
    try {
      const res = await apiPost("/vitals", payload);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setForm({
            frequenceCardiaque: "", spo2: "", tensionSystolique: "",
            tensionDiastolique: "", hrv: "", temperature: "", ecgNote: "",
          });
          onSaved?.();
          onClose();
        }, 1200);
      } else {
        const data = await res.json();
        setError(data.message || "Erreur lors de la sauvegarde.");
      }
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vitaux-modal-overlay" onClick={onClose}>
      <div className="vitaux-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vitaux-modal-header">
          <div>
            <h2 className="vitaux-modal-title">📊 Saisir les Signes Vitaux</h2>
            <p className="vitaux-modal-subtitle">Patient : <strong>{patientName}</strong></p>
          </div>
          <button className="vitaux-modal-close" onClick={onClose} title="Fermer">✕</button>
        </div>

        {success ? (
          <div className="vitaux-modal-success">
            <span className="vitaux-success-icon">✅</span>
            <p>Signes vitaux enregistrés avec succès !</p>
          </div>
        ) : (
          <form className="vitaux-modal-form" onSubmit={handleSubmit}>
            <div className="vitaux-field-grid">
              {FIELDS.map((f) => (
                <div key={f.key} className="vitaux-field-item">
                  <label className="vitaux-field-label">
                    <span className="vitaux-field-icon">{f.icon}</span>
                    {f.label}
                    <span className="vitaux-field-unit">{f.unit}</span>
                  </label>
                  <div className="vitaux-input-wrap">
                    <input
                      type="number"
                      className="vitaux-input"
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      min={f.min}
                      max={f.max}
                      step={f.step || 1}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      style={{ "--field-color": f.color }}
                    />
                    <span className="vitaux-input-unit">{f.unit}</span>
                  </div>
                  {/* Normal range hint */}
                  <span className="vitaux-range-hint">
                    Normal : {f.min} – {f.max} {f.unit}
                  </span>
                </div>
              ))}
            </div>

            {/* Note clinique */}
            <div className="vitaux-note-section">
              <label className="vitaux-field-label">
                📝 Note clinique <span style={{ fontWeight: 400, color: "#94a3b8" }}>(optionnel)</span>
              </label>
              <textarea
                className="vitaux-textarea"
                placeholder="Observations du médecin, contexte de la mesure..."
                value={form.ecgNote}
                onChange={(e) => handleChange("ecgNote", e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <div className="vitaux-error">
                ⚠️ {error}
              </div>
            )}

            <div className="vitaux-modal-footer">
              <button type="button" className="vitaux-btn-cancel" onClick={onClose} disabled={loading}>
                Annuler
              </button>
              <button type="submit" className="vitaux-btn-save" disabled={loading}>
                {loading ? (
                  <><span className="vitaux-spinner" /> Enregistrement...</>
                ) : (
                  "💾 Enregistrer les vitaux"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
