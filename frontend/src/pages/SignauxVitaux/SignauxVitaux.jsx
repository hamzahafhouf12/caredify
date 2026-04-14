import React, { useState, useEffect } from "react";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import { Link } from "react-router-dom";
import "./SignauxVitaux.css";

/* ─── Composant mini-ECG Graphique Dynamique ────────────────────────── */

function MiniECGGraph({ data, color = "#2f80ed" }) {
  if (!data || data.length === 0) {
    return (
      <svg
        viewBox="0 0 100 30"
        width="80"
        height="24"
        className="signaux-mini-ecg"
      >
        <polyline
          fill="none"
          stroke="#ccc"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points="0,15 100,15"
        />
      </svg>
    );
  }

  const step = Math.max(1, Math.floor(data.length / 100));
  const sampled = data.filter((_, i) => i % step === 0).slice(0, 100);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  const pts = sampled
    .map((v, i) => `${i},${30 - ((v - min) / range) * 25}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${sampled.length} 30`}
      width="80"
      height="24"
      className="signaux-mini-ecg"
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

/* ─── Composant Principal ────────────────────────────────────────── */

function SignauxVitaux() {
  const [ecgs, setEcgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const fetchEcgs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("caredify_token");
      const res = await fetch(`${API_URL}/ecg/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEcgs(data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des ECGs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEcgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Signaux Vitaux",
  }));

  return (
    <MedicalLayout
      breadcrumb="Signaux Vitaux"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center signaux-page">
        <h1 className="cdash-page-title">Liste des ECG</h1>

        {/* Action Bar */}
        <div className="signaux-toolbar">
          <button className="patients-btn-icon">＋</button>
          <button className="patients-btn-icon">⇅</button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="signaux-empty">
            <div className="cdash-spinner" style={{ margin: "0 auto 20px" }}></div>
            <h3>Chargement en cours</h3>
            <p>Récupération des signaux vitaux...</p>
          </div>
        ) : ecgs.length === 0 ? (
          <div className="signaux-empty">
            <div className="signaux-empty-icon">📊</div>
            <h3>Aucun tracé</h3>
            <p>Aucun ECG n'est enregistré pour le moment.</p>
          </div>
        ) : (
          <div className="cdash-card signaux-table-card">
            <div className="cdash-table-wrap">
              <table className="cdash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Analyse</th>
                    <th>Dernier ECG</th>
                    <th>Voir Historique ECG</th>
                    <th>Voir Fiche patient</th>
                  </tr>
                </thead>
                <tbody>
                  {ecgs.map((ecg) => (
                    <tr key={ecg._id}>
                      <td className="signaux-td-date">
                        {new Date(ecg.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <div className="patient-name-cell">
                          <span className="patient-avatar-mini">👤</span>
                          <strong>
                            {ecg.patient?.nom} {ecg.patient?.prenom}
                          </strong>
                        </div>
                      </td>
                      <td className="signaux-td-analyse">
                        {ecg.iaInterpretations?.resumeIA ||
                          ecg.iaInterpretations?.resumeAlerte ||
                          "Analyse en cours / Non spécifié"}
                      </td>
                      <td>
                        <div className="signaux-ecg-stack">
                          <MiniECGGraph
                            data={ecg.signalData}
                            color={
                              (ecg.iaInterpretations?.scoreRisque || 0) >= 70
                                ? "#ef4444"
                                : (ecg.iaInterpretations?.scoreRisque || 0) >= 40
                                ? "#f59e0b"
                                : "#10b981"
                            }
                          />
                        </div>
                      </td>
                      <td>
                        <Link
                          to={`/cardiologue/signaux-vitaux/historique?patientId=${ecg.patient?._id}`}
                          className="cdash-link-action cdash-link-action--sm"
                        >
                          Historique ECG
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/cardiologue/patients/${ecg.patient?._id}`}
                          className="cdash-link-action cdash-link-action--sm"
                        >
                          Voir fiche
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MedicalLayout>
  );
}

export default SignauxVitaux;
