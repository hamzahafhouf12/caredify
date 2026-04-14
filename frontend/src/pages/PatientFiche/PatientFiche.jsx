import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import InteractiveECG from "../../components/medical/InteractiveECG";
import AIInsightsCard from "../../components/medical/AIInsightsCard";
import PatientTrends from "../../components/medical/PatientTrends";
import PatientMedicalModal from "../../components/medical/PatientMedicalModal";
import PrescriptionModal from "../../components/modals/PrescriptionModal";
import { getSocket } from "../../utils/socket";
import "./PatientFiche.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

function ECGWaveformFull({ points }) {
  if (!points || points.length === 0) {
    return (
      <svg
        viewBox="0 0 1000 150"
        className="fiche-ecg-svg"
        preserveAspectRatio="none"
      >
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#888"
        >
          Aucun tracé ECG disponible
        </text>
      </svg>
    );
  }
  const svgPoints = points
    .map((val, i) => {
      const x = (i / (points.length - 1)) * 1000;
      const y = 75 - val * 50;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 1000 150"
      className="fiche-ecg-svg"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="#2f80ed"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={svgPoints}
      />
    </svg>
  );
}

function PatientFiche() {
  const { id } = useParams();
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
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescripts, setLoadingPrescripts] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const reportRef = useRef(null);

  // États pour le live ECG
  const [isLive, setIsLive] = useState(false);
  const [livePoints, setLivePoints] = useState([]);
  const [liveAnnotations, setLiveAnnotations] = useState([]);
  const liveBufferRef = useRef([]);
  const annotBufferRef = useRef([]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("caredify_token");
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setPatient(data);
    } catch (err) {
      setError("Erreur lors du chargement des informations du patient");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (days = 30) => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem("caredify_token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/patients/${id}/full-history?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) setHistoryData(data);
    } catch (err) {
      console.error("Erreur historique:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [id]);

  useEffect(() => {
    if (activeTab === "history") fetchHistory(historyPeriod);
    if (activeTab === "prescriptions") fetchPrescriptions();
  }, [activeTab, historyPeriod]);

  const fetchPrescriptions = async () => {
    try {
      setLoadingPrescripts(true);
      const token = localStorage.getItem("caredify_token");
      const res = await fetch(`${API_BASE_URL}/prescriptions/patient/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data);
      }
    } catch (err) {
      console.error("Fetch prescriptions error:", err);
    } finally {
      setLoadingPrescripts(false);
    }
  };

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
      const token = localStorage.getItem("caredify_token");
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(
        `${API_URL}/ecg/${patient.lastEcg._id}/review`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ decisionIA: decision }),
        },
      );
      if (response.ok) await fetchPatient();
    } catch (err) {
      console.error("Review error:", err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSaveMedicalProfile = async (medicalData) => {
    try {
      const token = localStorage.getItem("caredify_token");
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/patients/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(medicalData),
      });
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
      const token = localStorage.getItem("caredify_token");
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(
        `${API_URL}/ecg/${patient.lastEcg._id}/annotation`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ annotationMedecin: text }),
        },
      );
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
      const token = localStorage.getItem("caredify_token");
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(
        `${API_URL}/ecg/${patient.lastEcg._id}/annotations_temp`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(annotationData),
        },
      );
      if (response.ok) await fetchPatient();
    } catch (err) {
      console.error("Temporal Annotation save error:", err);
    }
  };

  const handleSavePrescription = async (prescData) => {
    try {
      const token = localStorage.getItem("caredify_token");
      const res = await fetch(`${API_BASE_URL}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: id,
          medicaments: prescData.medicaments,
          notes: prescData.notes,
          ecgRecord: patient.lastEcg?._id,
        }),
      });

      if (res.ok) {
        await fetchPrescriptions();
        setIsPrescriptionModalOpen(false);
      }
    } catch (err) {
      console.error("Save prescription error:", err);
    }
  };

  const handleExportPrescription = (prescId, format) => {
    const token = localStorage.getItem("caredify_token");
    window.open(`${API_BASE_URL}/prescriptions/${prescId}/export/${format}?token=${token}`, "_blank");
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPDF(true);

    // Attendre que le re-render applique la classe .pdf-mode
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(reportRef.current, {
          scale: 2, // Haute définition
          useCORS: true,
          logging: false,
        });

        const imgWidth = 210; // A4 dimension in mm
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        const doc = new jsPDF("p", "mm", "a4");
        let position = 0;

        doc.addImage(
          canvas.toDataURL("image/jpeg", 1.0),
          "JPEG",
          0,
          position,
          imgWidth,
          imgHeight,
        );
        heightLeft -= pageHeight;

        // Ajouter pages supp. si fiche trop longue
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          doc.addPage();
          doc.addImage(
            canvas.toDataURL("image/jpeg", 1.0),
            "JPEG",
            0,
            position,
            imgWidth,
            imgHeight,
          );
          heightLeft -= pageHeight;
        }

        doc.save(
          `DMP_${patient.nom.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`,
        );
      } catch (err) {
        console.error("Erreur PDF:", err);
      } finally {
        setIsExportingPDF(false);
      }
    }, 100);
  };

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Patients",
  }));

  if (loading) {
    return (
      <MedicalLayout
        breadcrumb="Patients / Fiche Patient"
        navItems={themedNavItems}
        doctorInfo={doctorInfo}
      >
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
      </MedicalLayout>
    );
  }

  return (
    <MedicalLayout
      breadcrumb="Patients / Fiche Patient"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
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
                  le {new Date(patient.createdAt).toLocaleDateString()}
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

        {activeTab === "current" ? (
          <>
            {/* Vital Data Section */}
            <div className="fiche-section">
              <h2 className="fiche-section-title">Données Vitales</h2>
              <div className="fiche-vitals-grid">
                <div className="cdash-card fiche-vital-card">
                  <div className="fiche-vital-card__head">
                    <p className="fiche-vital-card__label">
                      Frequence Cardiaque :{" "}
                      {patient.lastVitals?.frequenceCardiaque || "--"} bpm
                    </p>
                  </div>
                  <MiniGraph
                    points={patient.vitalsHistory
                      ?.map(
                        (v, i) =>
                          `${i * 5},${40 - (v.frequenceCardiaque / 150) * 40}`,
                      )
                      .join(" ")}
                  />
                </div>
                <div className="cdash-card fiche-vital-card">
                  <div className="fiche-vital-card__head">
                    <p className="fiche-vital-card__label">
                      Temperature : {patient.lastVitals?.temperature || "--"} °C
                    </p>
                  </div>
                  <MiniGraph
                    points={patient.vitalsHistory
                      ?.map(
                        (v, i) =>
                          `${i * 5},${40 - ((v.temperature - 30) / 10) * 40}`,
                      )
                      .join(" ")}
                  />
                </div>
                <div className="cdash-card fiche-vital-card">
                  <div className="fiche-vital-card__head">
                    <p className="fiche-vital-card__label">
                      SPO₂ : {patient.lastVitals?.spo2 || "--"}%
                    </p>
                  </div>
                  <MiniGraph
                    points={patient.vitalsHistory
                      ?.map((v, i) => `${i * 5},${40 - (v.spo2 / 100) * 40}`)
                      .join(" ")}
                  />
                </div>
                <div className="cdash-card fiche-vital-card">
                  <div className="fiche-vital-card__head">
                    <p className="fiche-vital-card__label">
                      HRV : {patient.lastVitals?.hrv || "--"} ms
                    </p>
                  </div>
                  <MiniGraph
                    points={patient.vitalsHistory
                      ?.map((v, i) => `${i * 5},${40 - (v.hrv / 200) * 40}`)
                      .join(" ")}
                  />
                </div>
              </div>
            </div>

            {/* ECG Section */}
            <div className="fiche-ecg-grid-layout">
              <div className="cdash-card fiche-ecg-card">
                <div className="fiche-ecg-card__content">
                  <div className="fiche-ecg-card__left">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        marginBottom: "15px",
                      }}
                    >
                      <h2
                        className="fiche-section-title"
                        style={{ marginBottom: 0 }}
                      >
                        Analyse ECG Interactive
                      </h2>
                      {isLive && (
                        <span
                          style={{
                            color: "red",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          ● LIVE MONITORING
                        </span>
                      )}
                    </div>
                    <InteractiveECG
                      points={
                        isLive ? livePoints : patient.lastEcg?.signalData || []
                      }
                      annotations={isLive ? liveAnnotations : []}
                      temporalAnnotations={
                        patient.lastEcg?.annotationsTemporelles || []
                      }
                      onAddTemporalAnnotation={handleAddTemporalAnnotation}
                      sampleRate={250}
                      isLive={isLive}
                    />
                  </div>
                  <div className="fiche-ecg-card__right">
                    <button
                      className="patients-btn-action-blue"
                      onClick={() =>
                        navigate("/cardiologue/signaux-vitaux/historique")
                      }
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
                            {new Date(alert.createdAt).toLocaleDateString()}
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
                                " {alert.annotationMedecin} "
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
                              {new Date(obs.date).toLocaleDateString()}{" "}
                              {new Date(obs.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
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
                  <span style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</span>
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
                          <td>{new Date(p.createdAt).toLocaleDateString()}</td>
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
    </MedicalLayout>
  );
}

export default PatientFiche;
