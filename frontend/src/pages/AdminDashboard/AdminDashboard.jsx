import React from "react";
import MedicalLayout from "../../components/layout/MedicalLayout";

export default function AdminDashboard() {
  const adminInfo = {
    name: "Administrateur Système",
    specialty: "Support & Gestion",
    avatar: "🛡️",
  };

  const navItems = [
    { icon: "📊", label: "Tableau de Bord", path: "/admin", active: true },
    { icon: "🏥", label: "Gestion des Cliniques", path: "/admin" },
    { icon: "👨‍⚕️", label: "Gestion des Médecins", path: "/admin" },
    { icon: "⚙️", label: "Paramètres Système", path: "/admin" },
    { icon: "🚪", label: "Déconnexion", path: "/" },
  ];

  return (
    <MedicalLayout breadcrumb="Espace Administrateur" navItems={navItems} doctorInfo={adminInfo}>
      <div className="cdash-center" style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", color: "#1e293b", margin: "0 0 8px 0" }}>⚙️ Administration Centrale</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "1.1rem" }}>
            Supervision globale de la plateforme Caredify
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          {/* Card 1 */}
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", borderLeft: "4px solid #3b82f6" }}>
            <h3 style={{ fontSize: "1rem", color: "#64748b", margin: "0 0 10px 0" }}>Comptes Actifs</h3>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#1e293b" }}>124</div>
            <p style={{ margin: "5px 0 0", fontSize: "0.85rem", color: "#10b981" }}>↑ +12 ce mois</p>
          </div>
          {/* Card 2 */}
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", borderLeft: "4px solid #8b5cf6" }}>
            <h3 style={{ fontSize: "1rem", color: "#64748b", margin: "0 0 10px 0" }}>Cliniques Partenaires</h3>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#1e293b" }}>8</div>
            <p style={{ margin: "5px 0 0", fontSize: "0.85rem", color: "#64748b" }}>2 en attente de validation</p>
          </div>
          {/* Card 3 */}
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", borderLeft: "4px solid #10b981" }}>
            <h3 style={{ fontSize: "1rem", color: "#64748b", margin: "0 0 10px 0" }}>Santé du Serveur IA</h3>
            <div style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#1e293b" }}>100%</div>
            <p style={{ margin: "5px 0 0", fontSize: "0.85rem", color: "#10b981" }}>Système opérationnel (Uvicorn)</p>
          </div>
        </div>

        <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: "1.25rem", color: "#1e293b", margin: "0 0 1rem 0" }}>Journal d'Activité Récent</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #10b981" }}>
              <strong>11:20</strong> - Le Dr Kilani Chaoua s'est connecté.
            </div>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #3b82f6" }}>
              <strong>10:15</strong> - Serveur IA FastAPI démarré avec succès.
            </div>
            <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #f59e0b" }}>
              <strong>Hier</strong> - Nouvelle inscription de clinique en attente d'approbation.
            </div>
          </div>
        </div>
      </div>
    </MedicalLayout>
  );
}
