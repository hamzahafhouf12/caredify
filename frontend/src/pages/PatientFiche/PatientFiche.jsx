import { useState, useEffect, useRef, useCallback } from "react";

import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import InteractiveECG from "../../components/medical/InteractiveECG";
import AIInsightsCard, { CLINICAL_DATA } from "../../components/medical/AIInsightsCard";
import PatientTrends from "../../components/medical/PatientTrends";
import PatientMedicalModal from "../../components/medical/PatientMedicalModal";
import PrescriptionModal from "../../components/modals/PrescriptionModal";
import VitauxModal from "../../components/medical/VitauxModal";
import { getSocket } from "../../utils/socket";
import { API_BASE_URL } from "../../constants/api";
import { apiGet, apiPost, apiPut } from "../../utils/api";
import { formatDate, formatDateTime } from "../../utils/date";
import "./PatientFiche.css";


function MiniGraph({ points, color = "#2f80ed" }) {
  return (
    <svg viewBox="0 0 100 40" className="fiche-mini-graph">
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



function PatientFiche() {
  // On utilise localStorage au lieu de useParams pour garder une URL propre (/fichepatient)
  const id = localStorage.getItem("activePatientId");
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("current"); // "current" | "history"
  const [historyData, setHistoryData] = useState(null);
  const [historyPeriod, setHistoryPeriod] = useState(30);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isVitauxModalOpen, setIsVitauxModalOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescripts, setLoadingPrescripts] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const reportRef = useRef(null);
  const pdfRef = useRef(null);

  // États pour le live ECG
  const [isLive, setIsLive] = useState(false);
  const [livePoints, setLivePoints] = useState([]);
  const [liveAnnotations, setLiveAnnotations] = useState([]);
  const liveBufferRef = useRef([]);
  const annotBufferRef = useRef([]);

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiGet(`/patients/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setPatient(data);
    } catch {
      setError("Erreur lors du chargement des informations du patient");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchHistory = useCallback(async (days = 30) => {
    try {
      setLoadingHistory(true);
      const response = await apiGet(`/patients/${id}/full-history?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
      }
    } catch {
      console.error("Erreur historique");
    } finally {
      setLoadingHistory(false);
    }
  }, [id]);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoadingPrescripts(true);
      const res = await apiGet(`/prescriptions/patient/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data);
      }
    } catch {
      console.error("Fetch prescriptions error");
    } finally {
      setLoadingPrescripts(false);
    }
  }, [id]);


  useEffect(() => {
    if (!id) {
      navigate("/cardiologue/patients");
      return;
    }
    fetchPatient();
  }, [id, fetchPatient, navigate]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory(historyPeriod);
    if (activeTab === "prescriptions") fetchPrescriptions();
  }, [activeTab, historyPeriod, fetchHistory, fetchPrescriptions]);

  // Support de l'auto-ouverture du modal d'édition via query param ?edit=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") === "true") {
      setIsMedicalModalOpen(true);
      // Nettoyer l'URL (optionnel)
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);




  // Gestion du Socket pour le Live ECG
  useEffect(() => {
    if (isLive) {
      const socket = getSocket();
      socket.emit("start_ecg_stream", id);

      socket.on("ecg_data", (payload) => {
        // Points
        const newPoints = [...liveBufferRef.current, ...payload.data].slice(
          -3000,
        );
        liveBufferRef.current = newPoints;
        setLivePoints(newPoints);

        // Annotations
        if (payload.annotations?.length > 0) {
          const currentLength = liveBufferRef.current.length;
          const newAnnots = payload.annotations.map((a) => ({
            ...a,
            index: currentLength - (payload.data.length - a.index),
          }));
          const updatedAnnots = [...annotBufferRef.current, ...newAnnots]
            .filter((a) => a.index > currentLength - 3000) // Nettoyer les vieilles annotations
            .map((a) => ({ ...a, index: a.index })); // On pourrait ré-indexer ici si nécessaire

          annotBufferRef.current = updatedAnnots;
          setLiveAnnotations(updatedAnnots);
        }
      });

      return () => {
        socket.emit("stop_ecg_stream", id);
        socket.off("ecg_data");
        liveBufferRef.current = [];
        annotBufferRef.current = [];
      };
    }
  }, [isLive, id]);

  const handleReview = async (decision) => {
    if (!patient?.lastEcg?._id) return;
    setReviewLoading(true);
    try {
      const response = await apiPut(`/ecg/${patient.lastEcg._id}/review`, { decisionIA: decision });
      if (response.ok) await fetchPatient();
    } catch (err) {
      console.error("Review error:", err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSaveMedicalProfile = async (medicalData) => {
    try {
      const response = await apiPut(`/patients/${id}`, medicalData);
      if (response.ok) {
        await fetchPatient();
        setIsMedicalModalOpen(false);
      } else {
        const errData = await response.json();
        console.error("Save medical Error:", errData);
      }
    } catch (err) {
      console.error("Save medical network error:", err);
    }
  };

  const handleSaveAnnotation = async (text) => {
    if (!patient?.lastEcg?._id) return;
    setReviewLoading(true);
    try {
      const response = await apiPut(`/ecg/${patient.lastEcg._id}/annotation`, { annotationMedecin: text });
      if (response.ok) await fetchPatient();
    } catch (err) {
      console.error("Annotation save error:", err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAddTemporalAnnotation = async (annotationData) => {
    if (!patient?.lastEcg?._id) return;
    try {
      const response = await apiPut(`/ecg/${patient.lastEcg._id}/annotations_temp`, annotationData);
      if (response.ok) await fetchPatient();
    } catch (err) {
      console.error("Temporal Annotation save error:", err);
    }
  };

  const handleSavePrescription = async (prescData) => {
    try {
      const res = await apiPost(`/prescriptions`, {
        patientId: id,
        medicaments: prescData.medicaments,
        notes: prescData.notes,
        ecgRecord: patient.lastEcg?._id,
      });

      if (res.ok) {
        await fetchPrescriptions();
        setIsPrescriptionModalOpen(false);
      }
    } catch {
      console.error("Save prescription error");
    }
  };


  const handleExportPrescription = (prescId, format) => {
    const token = localStorage.getItem("caredify_token");
    window.open(`${API_BASE_URL}/prescriptions/${prescId}/export/${format}?token=${token}`, "_blank");
  };

  const handleExportPDF = () => {
    if (!patient) return;
    setIsExportingPDF(true);

    setTimeout(async () => {
      try {
        const element = pdfRef.current;
        const canvas = await html2canvas(element, {
          scale: 3, // Ultra haute définition pour les courbes
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const pdf = new jsPDF("p", "mm", "a4");
        
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        
        pdf.save(
          `RAPPORT_ECG_${patient.nom.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`,
        );
      } catch (err) {
        console.error("Erreur PDF:", err);
      } finally {
        setIsExportingPDF(false);
      }
    }, 200);
  };

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Patients",
  }));

  return (
    <MedicalLayout
      breadcrumb="Patients / Fiche Patient"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      {error ? (
        <div className="cdash-center" style={{ textAlign: "center", padding: "100px 0" }}>
          <h2 style={{ color: "#e53e3e", marginBottom: "1rem" }}>⚠️ Oups !</h2>
          <p style={{ color: "#4a5568", marginBottom: "2rem" }}>{error}</p>
          <button
            className="patients-btn-action-blue"
            onClick={() => fetchPatient()}
          >
            Réessayer
          </button>
        </div>
      ) : loading ? (
        <div
          className="cdash-center"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <h2>Chargement...</h2>
        </div>
      ) : patient && (
        <>
          <div
            ref={reportRef}
        className={`cdash-center fiche-container ${isExportingPDF ? "pdf-mode" : ""}`}
        style={{
          background: "transparent",
          padding: isExportingPDF ? "20px" : "0",
        }}
      >
        {/* Header Bar */}
        <div className="fiche-header-bar">
          <h1 className="fiche-header-title">Fiche Patient : {patient.nom}</h1>
          <div style={{ display: "flex", gap: "10px", marginLeft: "auto" }}>
            <button
              className="patients-btn-action-blue"
              style={{
                background: "#10b981",
                color: "white",
                borderColor: "#059669",
              }}
              onClick={handleExportPDF}
              disabled={isExportingPDF}
            >
              {isExportingPDF ? "Génération..." : "📄 Exporter Rapport PDF"}
            </button>
            <button
              className={`patients-btn-action-${isLive ? "red" : "blue"}`}
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? "Arrêter Monitoring" : "Lancer Monitoring Direct"}
            </button>
            <button
              className="patients-btn-action-blue"
              style={{ background: "white", color: "#2f80ed" }}
              onClick={() => navigate("/cardiologue/patients")}
            >
              Retour
            </button>
          </div>
        </div>

        {/* Patient Info Card */}
        <div className="cdash-card fiche-info-card">
          <div className="fiche-info-card__left">
            <div className="fiche-patient-avatar-wrap">
              <div className="fiche-patient-avatar">👤</div>
            </div>
            <div className="fiche-info-grid">
              <div className="fiche-info-item">
                <span className="fiche-info-label">Nom et Prénom</span>
                <span className="fiche-info-value">{patient.nom}</span>
              </div>
              <div className="fiche-info-item">
                <span className="fiche-info-label">Age</span>
                <span className="fiche-info-value">{patient.age}</span>
              </div>
              <div className="fiche-info-item">
                <span className="fiche-info-label">CIN</span>
                <span className="fiche-info-value">{patient.cin}</span>
              </div>
            </div>
          </div>
          <div className="fiche-info-divider"></div>

          <div className="fiche-info-card__middle">
            <div
              className="fiche-info-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span className="fiche-info-label" style={{ color: "#2f80ed" }}>
                Profil Clinique 🩺
              </span>
              <button
                onClick={() => setIsMedicalModalOpen(true)}
                className="btn-edit-medical"
                title="Modifier le dossier"
              >
                ✏️ Éditer
              </button>
            </div>
            <div className="fiche-info-item">
              <span className="fiche-info-label">Groupe Sanguin</span>
              <span
                className="fiche-info-value"
                style={{ fontWeight: "bold", color: "#e53e3e" }}
              >
                {patient.groupeSanguin || "Non renseigné"}
              </span>
            </div>
            <div className="fiche-info-item">
              <span className="fiche-info-label">Antécédents</span>
              <div className="medical-badges">
                {patient.antecedents?.length ? (
                  patient.antecedents.map((ant, i) => (
                    <span key={i} className="medical-badge ant-badge">
                      {ant}
                    </span>
                  ))
                ) : (
                  <span className="fiche-info-value">Aucun</span>
                )}
              </div>
            </div>
            <div className="fiche-info-item">
              <span className="fiche-info-label">Traitements</span>
              <div className="medical-badges">
                {patient.traitementsEnCours?.length ? (
                  patient.traitementsEnCours.map((tr, i) => (
                    <span key={i} className="medical-badge trait-badge">
                      {tr}
                    </span>
                  ))
                ) : (
                  <span className="fiche-info-value">Aucun</span>
                )}
              </div>
            </div>
          </div>

          <div className="fiche-info-divider"></div>

          <div className="fiche-info-card__right">
            <div className="fiche-info-grid">
              <div className="fiche-info-item">
                <span className="fiche-info-label">Adresse</span>
                <span className="fiche-info-value">{patient.adresse}</span>
              </div>
              <div className="fiche-info-item">
                <span className="fiche-info-label">Etat actuel</span>
                <span className="fiche-info-value">{patient.etat}</span>
              </div>
              <div className="fiche-info-item">
                <span className="fiche-info-label">Dossier</span>
                <span className="fiche-info-value">
                  le {formatDate(patient.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="fiche-tabs">
          <button
            className={`fiche-tab-btn ${activeTab === "current" ? "active" : ""}`}
            onClick={() => setActiveTab("current")}
          >
            📋 État Actuel
          </button>
          <button
            className={`fiche-tab-btn ${activeTab === "prescriptions" ? "active" : ""}`}
            onClick={() => setActiveTab("prescriptions")}
          >
            📜 Ordonnances
          </button>
          <button
            className={`fiche-tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            📊 Historique & Tendances
          </button>
        </div>

        {activeTab === "current" && (

          <>
            <div className="fiche-section">
              <div className="fiche-section-header" style={{marginBottom:'1rem'}}>
                <h2 className="fiche-section-title" style={{marginBottom:0}}>Données Vitales</h2>
                {!patient.lastVitals && (
                  <button
                    className="patients-btn-action-blue"
                    style={{fontSize:'0.8rem', padding:'6px 14px'}}
                    onClick={() => setIsVitauxModalOpen(true)}
                    title="Saisir les signes vitaux de ce patient"
                  >
                    ➕ Saisir les vitaux
                  </button>
                )}
              </div>
              {!patient.lastVitals ? (
                <div className="fiche-empty-state" style={{padding:'1.5rem'}}>
                  <span style={{fontSize:'2rem',display:'block',marginBottom:'0.5rem'}}>📊</span>
                  <p style={{color:'#64748b',margin:0}}>Aucun signe vital enregistré pour ce patient.</p>
                  <p style={{color:'#94a3b8',fontSize:'0.8rem',marginTop:'0.3rem'}}>Les données apparaîtront ici dès qu'un appareil transmettra des mesures.</p>
                </div>
              ) : (
              <div className="fiche-vitals-grid">
                {[
                  { label: "Frequence Cardiaque", val: patient.lastVitals?.frequenceCardiaque, unit: "bpm", scale: 150, key: "frequenceCardiaque" },
                  { label: "Temperature", val: patient.lastVitals?.temperature, unit: "°C", scale: 10, offset: 30, key: "temperature" },
                  { label: "SPO₂", val: patient.lastVitals?.spo2, unit: "%", scale: 100, key: "spo2" },
                  { label: "HRV", val: patient.lastVitals?.hrv, unit: "ms", scale: 200, key: "hrv" }
                ].map((vital, idx) => (
                  <div key={idx} className="cdash-card fiche-vital-card">
                    <div className="fiche-vital-card__head">
                      <p className="fiche-vital-card__label">
                        {vital.label} : <strong style={{color: vital.val ? '#2563eb' : '#94a3b8'}}>{vital.val ?? '--'}</strong> {vital.unit}
                      </p>
                    </div>
                    <MiniGraph
                      points={[...patient.vitalsHistory].reverse().map((v, i) =>
                        `${i * 5},${40 - ((v[vital.key] - (vital.offset || 0)) / vital.scale) * 40}`
                      ).join(" ")}
                    />
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* ECG Section */}
            <div className="fiche-ecg-grid-layout">
              <div className="cdash-card fiche-ecg-card">
                <div className="fiche-ecg-card__content">
                  <div className="fiche-ecg-card__left">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"15px" }}>
                      <h2 className="fiche-section-title" style={{ marginBottom: 0 }}>
                        Analyse ECG Interactive
                        {!patient.lastEcg && (
                          <span style={{fontSize:'0.75rem', fontWeight:500, color:'#94a3b8', marginLeft:'10px'}}>
                            — Aucun ECG enregistré
                          </span>
                        )}
                      </h2>
                      {isLive && (
                        <span style={{ color:"red", fontWeight:"bold", fontSize:"14px" }}>
                          ● LIVE MONITORING
                        </span>
                      )}
                    </div>

                    {/* Badge IA si ECG existe */}
                    {patient.lastEcg && !isLive && (
                      <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px'}}>
                        {(() => {
                          const probas = patient.lastEcg.iaInterpretations?.detailedClassification || {};
                          if (probas.pvc > 0.5) return <span className="fiche-ia-flag fiche-ia-flag--red">🩺 PVC Detectée</span>;
                          if (probas.sveb > 0.5) return <span className="fiche-ia-flag fiche-ia-flag--orange">🩺 SVEB Detectée</span>;
                          return null;
                        })()}
                        
                        {patient.lastEcg.iaInterpretations?.arythmie && <span className="fiche-ia-flag fiche-ia-flag--red">⚡ Arythmie</span>}
                        {patient.lastEcg.iaInterpretations?.fibrillationAuriculaire && <span className="fiche-ia-flag fiche-ia-flag--red">🔴 Fibrillation A.</span>}
                        {patient.lastEcg.iaInterpretations?.tachycardie && <span className="fiche-ia-flag fiche-ia-flag--orange">⚠️ Tachycardie</span>}
                        
                        <span style={{marginLeft:'auto', fontSize:'0.75rem', color:'#94a3b8'}}>
                          Score : <strong style={{color: (patient.lastEcg.iaInterpretations?.scoreRisque||0)>=70?'#ef4444':(patient.lastEcg.iaInterpretations?.scoreRisque||0)>=40?'#f59e0b':'#22c55e'}}>
                            {patient.lastEcg.iaInterpretations?.scoreRisque ?? 0}/100
                          </strong>
                        </span>
                      </div>
                    )}

                    <InteractiveECG
                      points={isLive ? livePoints : patient.lastEcg?.signalData || []}
                      annotations={isLive ? liveAnnotations : []}
                      temporalAnnotations={patient.lastEcg?.annotationsTemporelles || []}
                      heatmap={patient.lastEcg?.iaInterpretations?.xaiHeatmap || []}
                      onAddTemporalAnnotation={handleAddTemporalAnnotation}
                      sampleRate={250}
                      isLive={isLive}
                    />
                  </div>
                  <div className="fiche-ecg-card__right">
                    <button
                      className="patients-btn-action-blue"
                      onClick={() => navigate("/cardiologue/signaux-vitaux/historique")}
                    >
                      Historique Complet
                    </button>
                  </div>
                </div>
              </div>
              <div className="fiche-ai-sidebar">
                <AIInsightsCard

                  interpretations={patient.lastEcg?.iaInterpretations}
                  decision={patient.lastEcg?.decisionIA || "en_attente"}
                  onReview={handleReview}
                  loading={reviewLoading}
                  annotationInitial={patient.lastEcg?.annotationMedecin}
                  onSaveAnnotation={handleSaveAnnotation}
                />
              </div>
            </div>

            {/* Alert History Section */}
            <div className="fiche-section">
              <h2 className="fiche-section-title">Historiques des alertes</h2>
              <div className="cdash-card fiche-history-card">
                <div className="cdash-table-wrap">
                  <table className="cdash-table fiche-v2-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Detail d'alerte</th>
                        <th>Type d'alerte</th>
                        <th>Commentaire de docteur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patient.alerts?.length === 0 && (
                        <tr>
                          <td
                            colSpan="4"
                            style={{
                              textAlign: "center",
                              padding: "20px",
                              color: "#888",
                            }}
                          >
                            Aucune alerte enregistrée
                          </td>
                        </tr>
                      )}
                      {patient.alerts?.map((alert, idx) => (
                        <tr key={idx}>
                          <td>
                            {formatDate(alert.createdAt)}
                          </td>
                          <td>{alert.detail}</td>
                          <td>
                            <span
                              className={`fiche-v2-badge fiche-v2-badge--${alert.type.toLowerCase() === "urgente" ? "red" : "orange"}`}
                            >
                              {alert.type}
                            </span>
                          </td>
                        <td>
                            {alert.annotationMedecin ? (
                              <span
                                style={{
                                  fontStyle: "italic",
                                  color: "#1e293b",
                                }}
                              >
                                {alert.annotationMedecin}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>
                                {alert.statut === "revisitée" ||
                                alert.statut === "validée"
                                  ? "Analyse effectuée (sans note)"
                                  : "Aucune annotation"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Observations Cliniques Section */}
            {patient.observations && patient.observations.length > 0 && (
              <div className="fiche-section">
                <h2 className="fiche-section-title">
                  Journal des Observations Cliniques
                </h2>
                <div className="cdash-card fiche-history-card">
                  <div className="cdash-table-wrap">
                    <table className="cdash-table fiche-v2-table">
                      <thead>
                        <tr>
                          <th style={{ width: "150px" }}>Date</th>
                          <th>Observation enregistrée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...patient.observations].reverse().map((obs, idx) => (
                          <tr key={idx}>
                            <td>
                              {formatDateTime(obs.date)}
                            </td>
                            <td>
                              <span style={{ color: "#334155" }}>
                                {obs.texte}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "prescriptions" && (
          <div className="fiche-prescriptions-section">
            <div className="fiche-section-header">
              <h2 className="fiche-section-title">Historique des Ordonnances</h2>
              <button 
                className="patients-btn-action-blue"
                onClick={() => setIsPrescriptionModalOpen(true)}
              >
                ＋ Nouvelle Ordonnance Digitale
              </button>
            </div>

            <div className="cdash-card fiche-history-card">
              {loadingPrescripts ? (
                <p style={{ padding: "40px", textAlign: "center" }}>Chargement des prescriptions...</p>
              ) : prescriptions.length === 0 ? (
                <div className="fiche-empty-state">
                  <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>📝</span>
                  <p>Aucune ordonnance n'a été émise pour ce patient.</p>
                </div>
              ) : (
                <div className="cdash-table-wrap">
                  <table className="cdash-table fiche-v2-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Médicaments</th>
                        <th>Statut</th>
                        <th>Exports</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((p) => (
                        <tr key={p._id}>
                          <td>{formatDate(p.createdAt)}</td>
                          <td>
                            <div className="presc-med-chips">
                              {p.medicaments.map((m, i) => (
                                <span key={i} className="presc-med-chip">{m.nom}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`presc-status-badge presc-status--${p.statut}`}>
                              {p.statut}
                            </span>
                          </td>
                          <td>
                            <div className="presc-export-actions">
                              <button onClick={() => handleExportPrescription(p._id, "pdf")} title="Exporter PDF">📄 PDF</button>
                              <button onClick={() => handleExportPrescription(p._id, "hl7")} title="Exporter HL7" style={{ background: '#fef3c7', color: '#92400e' }}>🔗 HL7</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="fiche-history-container">
            {loadingHistory ? (
              <div
                className="history-loader"
                style={{ textAlign: "center", padding: "100px 0" }}
              >
                <div
                  className="cdash-spinner"
                  style={{ margin: "0 auto 20px" }}
                ></div>
                <p>Analyse de l'historique longitudinal en cours...</p>
              </div>
            ) : (
            <PatientTrends 
              historyData={historyData} 
              period={historyPeriod} 
              onPeriodChange={(p) => setHistoryPeriod(p)}
            />
            )}
          </div>
        )}
      </div>

      <PatientMedicalModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        patient={patient}
        onSave={handleSaveMedicalProfile}
      />

      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        onSave={handleSavePrescription}
        patientName={patient.nom}
      />

      <VitauxModal
        isOpen={isVitauxModalOpen}
        onClose={() => setIsVitauxModalOpen(false)}
        patientId={id}
        patientName={patient.nom}
        onSaved={() => fetchPatient()}
      />
        </>
      )}

      {/* ─── TEMPLATE DE RAPPORT PROFESSIONNEL (HIDDEN) ─── */}
      {patient && (
        <div 
          ref={pdfRef} 
          className={`pdf-report-template ${isExportingPDF ? 'active' : ''}`}
        >
          {/* Header */}
          <div className="pdf-report-header">
            <div className="pdf-report-logo">
              💙 Caredify
            </div>
            <div className="pdf-report-title-group">
              <h1>Rapport d'Examen ECG</h1>
              <p>Réf: ECG-{patient._id?.slice(-6)} | Date: {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Grid: Patient Info & Clinical context */}
          <div className="pdf-report-grid">
            <div className="pdf-report-column">
              <h2 className="pdf-report-section-title">Informations Patient</h2>
              <table className="pdf-info-table">
                <tbody>
                  <tr><td className="pdf-info-label">Nom Complet</td><td className="pdf-info-value">{patient.nom}</td></tr>
                  <tr><td className="pdf-info-label">Âge / CIN</td><td className="pdf-info-value">{patient.age} ans | {patient.cin}</td></tr>
                  <tr><td className="pdf-info-label">Adresse</td><td className="pdf-info-value">{patient.adresse}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="pdf-report-column">
              <h2 className="pdf-report-section-title">Contexte Clinique</h2>
              <table className="pdf-info-table">
                <tbody>
                  <tr><td className="pdf-info-label">Groupe Sanguin</td><td className="pdf-info-value" style={{color:'#e53e3e'}}>{patient.groupeSanguin || "—"}</td></tr>
                  <tr><td className="pdf-info-label">Antécédents</td><td className="pdf-info-value">{patient.antecedents?.join(', ') || "Aucun"}</td></tr>
                  <tr><td className="pdf-info-label">Traitements</td><td className="pdf-info-value">{patient.traitementsEnCours?.join(', ') || "Aucun"}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ECG Trace */}
          <h2 className="pdf-report-section-title">Tracé ECG Électronique (Lead I)</h2>
          <div className="pdf-ecg-container">
            <div className="pdf-ecg-grid-bg"></div>
            {patient.lastEcg?.signalData?.length > 0 ? (
              <svg viewBox="0 0 1000 200" className="pdf-ecg-trace-svg">
                <polyline
                  fill="none"
                  stroke="#222"
                  strokeWidth="1.5"
                  points={patient.lastEcg.signalData.slice(0, 1000)
                    .map((val, i) => `${i},${100 - val * 70}`)
                    .join(" ")}
                />
              </svg>
            ) : (
              <p style={{textAlign:'center', padding:'40px', color:'#888'}}>Aucun tracé disponible</p>
            )}
          </div>

          {/* AI Findings */}
          <h2 className="pdf-report-section-title">Analyse Automatisée (Modèle IA v2.0)</h2>
          <div className="pdf-risk-summary" style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
             <span style={{fontSize:'12px', fontWeight:700}}>Score de Risque Global: <span style={{color: (patient.lastEcg?.iaInterpretations?.scoreRisque > 70 ? '#ef4444' : '#f59e0b')}}>{patient.lastEcg?.iaInterpretations?.scoreRisque || 0}%</span></span>
             <span style={{fontSize:'12px', color:'#64748b'}}>Statut: {patient.lastEcg?.decisionIA?.toUpperCase() || "EN ATTENTE"}</span>
          </div>
          
          <table className="pdf-findings-table">
            <thead>
              <tr>
                <th style={{width:'150px'}}>Anomalie Détectée</th>
                <th>Explication Clinique & Recommandation</th>
              </tr>
            </thead>
            <tbody>
              {patient.lastEcg?.iaInterpretations && Object.entries(patient.lastEcg.iaInterpretations)
                .filter(([key, val]) => val === true && CLINICAL_DATA[key])
                .map(([key]) => (
                  <tr key={key}>
                    <td>
                      <span className="pdf-severity-dot" style={{background: CLINICAL_DATA[key].severity === 'critical' ? '#ef4444' : '#f59e0b'}}></span>
                      <strong>{CLINICAL_DATA[key].label}</strong>
                    </td>
                    <td>
                      <p style={{margin:0}}><strong>Mécanisme:</strong> {CLINICAL_DATA[key].explanation}</p>
                      <p style={{margin:'5px 0 0', color:'#2563eb'}}><strong>Action:</strong> {CLINICAL_DATA[key].recommendation}</p>
                    </td>
                  </tr>
                ))}
              {!patient.lastEcg?.iaInterpretations && (
                <tr><td colSpan="2" style={{textAlign:'center'}}>Aucune donnée d'analyse disponible</td></tr>
              )}
            </tbody>
          </table>

          {/* Observations */}
          <h2 className="pdf-report-section-title">Observations du Cardiologue</h2>
          <div className="pdf-doctor-notes">
            {patient.lastEcg?.annotationMedecin || "Aucune observation manuelle ajoutée pour cet examen."}
          </div>

          {/* Footer */}
          <div className="pdf-footer">
            <div>
              <p>Document généré électroniquement par le système Caredify.</p>
              <p>ID Rapport: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            </div>
            <div className="pdf-signature-section">
              <div className="pdf-signature-line">
                Signature du Spécialiste
              </div>
            </div>
          </div>
        </div>
      )}
    </MedicalLayout>
  );
}

export default PatientFiche;
