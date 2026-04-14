import React, { useState, useEffect } from "react";
import "./PatientMedicalModal.css";

const PatientMedicalModal = ({ isOpen, onClose, patient, onSave }) => {
  const [groupeSanguin, setGroupeSanguin] = useState("");
  const [antecedents, setAntecedents] = useState([]);
  const [traitementsEnCours, setTraitementsEnCours] = useState([]);

  // Inputs temporaires pour ajouter à la liste
  const [antInput, setAntInput] = useState("");
  const [traitInput, setTraitInput] = useState("");
  const [obsInput, setObsInput] = useState("");

  useEffect(() => {
    if (patient) {
      setGroupeSanguin(patient.groupeSanguin || "");
      setAntecedents(patient.antecedents || []);
      setTraitementsEnCours(patient.traitementsEnCours || []);
      // Reset observation input when opening modal
      setObsInput("");
    }
  }, [patient, isOpen]);

  if (!isOpen) return null;

  const handleAddAntecedent = (e) => {
    e.preventDefault();
    if (antInput.trim()) {
      setAntecedents([...antecedents, antInput.trim()]);
      setAntInput("");
    }
  };

  const handleRemoveAntecedent = (index) => {
    setAntecedents(antecedents.filter((_, i) => i !== index));
  };

  const handleAddTraitement = (e) => {
    e.preventDefault();
    if (traitInput.trim()) {
      setTraitementsEnCours([...traitementsEnCours, traitInput.trim()]);
      setTraitInput("");
    }
  };

  const handleRemoveTraitement = (index) => {
    setTraitementsEnCours(traitementsEnCours.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Also save anything currently left in the inputs
    let finalAnts = [...antecedents];
    if (antInput.trim()) finalAnts.push(antInput.trim());

    let finalTraits = [...traitementsEnCours];
    if (traitInput.trim()) finalTraits.push(traitInput.trim());

    const newObsList = [...(patient.observations || [])];
    if (obsInput.trim()) {
      newObsList.push({ texte: obsInput.trim() });
    }

    onSave({
      groupeSanguin: groupeSanguin === "" ? null : groupeSanguin,
      antecedents: finalAnts,
      traitementsEnCours: finalTraits,
      observations: newObsList,
    });
  };

  return (
    <div className="medical-modal-overlay">
      <div className="medical-modal">
        <div className="medical-modal-header">
          <h2>Mettre à jour le Dossier Médical</h2>
          <button className="medical-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="medical-modal-body">
          {/* Groupe Sanguin */}
          <div className="form-group">
            <label>Groupe Sanguin</label>
            <select
              value={groupeSanguin}
              onChange={(e) => setGroupeSanguin(e.target.value)}
              className="medical-select"
            >
              <option value="">Sélectionner...</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <hr className="modal-divider" />

          {/* Antécédents */}
          <div className="form-group">
            <label>Antécédents Médicaux (Maladies, Chirurgies...)</label>
            <div className="tag-list">
              {antecedents.map((ant, idx) => (
                <span key={idx} className="medical-tag ant-tag">
                  {ant}
                  <button
                    type="button"
                    onClick={() => handleRemoveAntecedent(idx)}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="add-item-row">
              <input
                type="text"
                value={antInput}
                onChange={(e) => setAntInput(e.target.value)}
                placeholder="Ex: Diabète Type 2"
                onKeyDown={(e) => e.key === "Enter" && handleAddAntecedent(e)}
              />
              <button
                type="button"
                onClick={handleAddAntecedent}
                className="btn-add"
              >
                Ajouter
              </button>
            </div>
          </div>

          <hr className="modal-divider" />

          {/* Traitements */}
          <div className="form-group">
            <label>Traitements en cours</label>
            <div className="tag-list">
              {traitementsEnCours.map((trait, idx) => (
                <span key={idx} className="medical-tag trait-tag">
                  {trait}
                  <button
                    type="button"
                    onClick={() => handleRemoveTraitement(idx)}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="add-item-row">
              <input
                type="text"
                value={traitInput}
                onChange={(e) => setTraitInput(e.target.value)}
                placeholder="Ex: Aspirine 100mg/j"
                onKeyDown={(e) => e.key === "Enter" && handleAddTraitement(e)}
              />
              <button
                type="button"
                onClick={handleAddTraitement}
                className="btn-add"
              >
                Ajouter
              </button>
            </div>
          </div>

          <hr className="modal-divider" />

          {/* Observations Cliniques */}
          <div className="form-group">
            <label>Nouvelle Observation Clinique</label>
            <textarea
              className="medical-select"
              style={{ minHeight: "80px", resize: "vertical" }}
              value={obsInput}
              onChange={(e) => setObsInput(e.target.value)}
              placeholder="Saisissez une note clinique à ajouter au dossier du patient..."
            ></textarea>
          </div>

          <div className="medical-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-save">
              Sauvegarder le dossier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientMedicalModal;
