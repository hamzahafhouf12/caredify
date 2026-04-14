import React, { useState } from "react";
import "./PrescriptionModal.css";

export default function PrescriptionModal({ isOpen, onClose, onSave, patientName }) {
  const [medicaments, setMedicaments] = useState([{ nom: "", posologie: "", duree: "", instructions: "" }]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddMed = () => {
    setMedicaments([...medicaments, { nom: "", posologie: "", duree: "", instructions: "" }]);
  };

  const handleRemoveMed = (index) => {
    setMedicaments(medicaments.filter((_, i) => i !== index));
  };

  const handleMedChange = (index, field, value) => {
    const newMeds = [...medicaments];
    newMeds[index][field] = value;
    setMedicaments(newMeds);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({ medicaments, notes });
      setMedicaments([{ nom: "", posologie: "", duree: "", instructions: "" }]);
      setNotes("");
    } catch (err) {
      console.error("Prescription saving error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="presc-modal-overlay">
      <div className="presc-modal-card">
        <div className="presc-modal-header">
          <h2>Nouvelle Ordonnance — {patientName}</h2>
          <button className="presc-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="presc-modal-body">
          <div className="presc-meds-section">
            <div className="presc-section-title">
              <h3>Médicaments</h3>
              <button type="button" onClick={handleAddMed} className="presc-add-btn">
                ＋ Ajouter un médicament
              </button>
            </div>

            {medicaments.map((med, idx) => (
              <div key={idx} className="presc-med-row">
                <div className="presc-med-main">
                  <div className="presc-input-group">
                    <label>Nom du médicament</label>
                    <input 
                      type="text" 
                      required 
                      value={med.nom} 
                      onChange={(e) => handleMedChange(idx, "nom", e.target.value)}
                      placeholder="Ex: Aspirine"
                    />
                  </div>
                  <div className="presc-input-group">
                    <label>Posologie</label>
                    <input 
                      type="text" 
                      required 
                      value={med.posologie} 
                      onChange={(e) => handleMedChange(idx, "posologie", e.target.value)}
                      placeholder="Ex: 1 f/j"
                    />
                  </div>
                  <div className="presc-input-group">
                    <label>Durée</label>
                    <input 
                      type="text" 
                      required 
                      value={med.duree} 
                      onChange={(e) => handleMedChange(idx, "duree", e.target.value)}
                      placeholder="Ex: 3 mois"
                    />
                  </div>
                  {medicaments.length > 1 && (
                    <button type="button" onClick={() => handleRemoveMed(idx)} className="presc-remove-btn" title="Supprimer">
                      🗑️
                    </button>
                  )}
                </div>
                <div className="presc-input-group full-width">
                  <label>Instructions spécifiques</label>
                  <input 
                    type="text" 
                    value={med.instructions} 
                    onChange={(e) => handleMedChange(idx, "instructions", e.target.value)}
                    placeholder="Ex: Le soir au coucher"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="presc-notes-section">
            <label className="presc-section-title">Notes complémentaires (recommandations)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Conseils d'hygiène de vie, prochain rendez-vous..."
              rows="3"
            />
          </div>

          <div className="presc-modal-footer">
            <button type="button" onClick={onClose} className="presc-btn-cancel">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="presc-btn-submit">
              {isSubmitting ? "Enregistrement..." : "Émettres l'ordonnance digitale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
