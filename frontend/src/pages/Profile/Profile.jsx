import React, { useState, useEffect, useRef } from "react";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal/ChangePasswordModal";
import "./Profile.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Profile() {
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [isUploading, setIsUploading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("caredify_token");
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setIsUploading(true);
    try {
      const token = localStorage.getItem("caredify_token");
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUserProfile(updatedUser);
        // Force refresh MedicalLayout/Sidebar if needed, but since it's a separate fetch,
        // ideally we would use a context. For now, a window refresh or global event could work.
        // Let's just refresh the page to be sure everything (Sidebar, etc) is in sync.
        window.location.reload();
      } else {
        alert("Erreur lors du téléchargement de l'image");
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
      alert("Une erreur est survenue lors de l'upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const currentDoctor = userProfile
    ? {
        name: `Dr ${userProfile.prenom} ${userProfile.nom}`,
        specialty: userProfile.specialite || "Cardiologue",
        avatar: userProfile.avatar
          ? `${API_BASE_URL.replace("/api", "")}${userProfile.avatar}`
          : doctorInfo.avatar,
        email: userProfile.email,
        nom: userProfile.nom,
        prenom: userProfile.prenom,
      }
    : { ...doctorInfo, email: "kilani.chaoua@caredify.tn" };

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Profile",
  }));

  const stats = [
    { icon: "👥", label: "Patients suivis", value: "12" },
    { icon: "❤️", label: "ECG analysés", value: "48" },
    { icon: "⚡", label: "Alertes traitées", value: "7" },
    { icon: "📅", label: "Années d'expérience", value: "14" },
  ];

  const infoRows = [
    { label: "Nom complet", value: currentDoctor.name, icon: "👤" },
    {
      label: "Email professionnel",
      value: currentDoctor.email,
      icon: "📧",
    },
    { label: "Date de naissance", value: "19/02/1988", icon: "🎂" },
    { label: "Spécialité", value: currentDoctor.specialty, icon: "🫀" },
    { label: "Établissement", value: "Hôpital La Rabta, Tunis", icon: "🏥" },
    { label: "Téléphone", value: "+216 71 566 200", icon: "📞" },
  ];

  return (
    <MedicalLayout
      breadcrumb="Profil"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="profile-page">
        {/* ── HERO CARD ── */}
        <div className="profile-hero-card">
          {/* Cover Banner */}
          <div className="profile-cover">
            <div className="profile-cover-pattern" />
          </div>

          {/* Avatar + Name Row */}
          <div className="profile-identity">
            <div className="profile-avatar-wrap" onClick={handleAvatarClick} style={{ cursor: 'pointer' }}>
              <div className="profile-avatar-ring">
                {currentDoctor.avatar ? (
                  <img
                    src={currentDoctor.avatar}
                    alt="Doctor"
                    className="profile-avatar-img"
                    style={{ opacity: isUploading ? 0.5 : 1 }}
                  />
                ) : (
                  <div className="profile-avatar-emoji">👨‍⚕️</div>
                )}
                {isUploading && <div className="profile-avatar-loader">...</div>}
                <div className="profile-avatar-overlay">
                  <span>📸 Modifier</span>
                </div>
              </div>
              <div className="profile-avatar-badge" title="Compte vérifié">
                ✓
              </div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="profile-identity-info">
              <h1 className="profile-name">{currentDoctor.name}</h1>
              <div className="profile-tags">
                <span className="profile-tag profile-tag--blue">
                  🫀 Cardiologue
                </span>
                <span className="profile-tag profile-tag--green">
                  ✓ Vérifié
                </span>
                <span className="profile-tag profile-tag--gray">ID: #1234</span>
              </div>
            </div>

            <div className="profile-hero-actions">
              <button
                className="profile-btn-primary"
                onClick={() => setIsPwdModalOpen(true)}
              >
                🔒 Modifier le mot de passe
              </button>
              <button className="profile-btn-secondary">
                ✏️ Éditer le profil
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="profile-stats-row">
            {stats.map((s, i) => (
              <div key={i} className="profile-stat">
                <span className="profile-stat-icon">{s.icon}</span>
                <span className="profile-stat-value">{s.value}</span>
                <span className="profile-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS + INFO ── */}
        <div className="profile-body">
          {/* Tabs */}
          <div className="profile-tabs">
            <button
              className={`profile-tab-btn ${activeTab === "info" ? "active" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              📋 Informations
            </button>
            <button
              className={`profile-tab-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              🔐 Sécurité
            </button>
            <button
              className={`profile-tab-btn ${activeTab === "activity" ? "active" : ""}`}
              onClick={() => setActiveTab("activity")}
            >
              📊 Activité
            </button>
          </div>

          {/* Info Tab */}
          {activeTab === "info" && (
            <div className="profile-info-grid">
              {infoRows.map((row, i) => (
                <div key={i} className="profile-info-item">
                  <div className="profile-info-icon">{row.icon}</div>
                  <div className="profile-info-content">
                    <span className="profile-info-label">{row.label}</span>
                    <span className="profile-info-value">{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="profile-security-section">
              <div className="profile-security-card profile-security-card--green">
                <div className="profile-sec-icon">🛡️</div>
                <div className="profile-sec-content">
                  <h4>Données chiffrées</h4>
                  <p>
                    Toutes vos données sont chiffrées de bout en bout avec
                    AES-256.
                  </p>
                </div>
                <span className="profile-sec-badge profile-sec-badge--green">
                  Actif
                </span>
              </div>
              <div className="profile-security-card profile-security-card--blue">
                <div className="profile-sec-icon">🔑</div>
                <div className="profile-sec-content">
                  <h4>Mot de passe</h4>
                  <p>
                    Dernière modification il y a 30 jours. Recommandé : tous les
                    90 jours.
                  </p>
                </div>
                <button
                  className="profile-btn-primary"
                  onClick={() => setIsPwdModalOpen(true)}
                >
                  Modifier
                </button>
              </div>
              <div className="profile-security-card profile-security-card--gray">
                <div className="profile-sec-icon">📱</div>
                <div className="profile-sec-content">
                  <h4>Authentification 2FA</h4>
                  <p>
                    Couche de sécurité supplémentaire par SMS ou application.
                  </p>
                </div>
                <span className="profile-sec-badge profile-sec-badge--gray">
                  Bientôt
                </span>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="profile-activity-section">
              {[
                {
                  action: "Consultation ECG",
                  patient: "Test Patient",
                  time: "Aujourd'hui 14:32",
                  icon: "📈",
                },
                {
                  action: "Alerte validée",
                  patient: "Test Patient",
                  time: "Aujourd'hui 11:15",
                  icon: "✅",
                },
                {
                  action: "Rapport PDF généré",
                  patient: "Test Patient",
                  time: "Hier 16:48",
                  icon: "📄",
                },
                {
                  action: "Connexion au système",
                  patient: "—",
                  time: "Hier 08:00",
                  icon: "🔐",
                },
              ].map((act, i) => (
                <div key={i} className="profile-activity-item">
                  <div className="profile-activity-icon">{act.icon}</div>
                  <div className="profile-activity-content">
                    <span className="profile-activity-action">
                      {act.action}
                    </span>
                    <span className="profile-activity-patient">
                      {act.patient !== "—"
                        ? `Patient : ${act.patient}`
                        : act.patient}
                    </span>
                  </div>
                  <span className="profile-activity-time">{act.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPwdModalOpen}
        onClose={() => setIsPwdModalOpen(false)}
      />
    </MedicalLayout>
  );
}
