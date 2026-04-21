import React, { useState, useEffect, useRef } from "react";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import ChangePasswordModal from "../../components/modals/ChangePasswordModal/ChangePasswordModal";
import { apiGet, apiFetch, apiPost } from "../../utils/api";
import { API_BASE_URL } from "../../constants/api";
import "./Profile.css";

/* ─── Modal Édition Profil ─────────────────────────────────────────── */
function EditProfileModal({ isOpen, onClose, profile, onSaved }) {
  const [form, setForm] = useState({
    nom: profile?.nom || "",
    prenom: profile?.prenom || "",
    specialite: profile?.specialite || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({
        nom: profile.nom || "",
        prenom: profile.prenom || "",
        specialite: profile.specialite || "",
      });
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("nom", form.nom);
      formData.append("prenom", form.prenom);
      formData.append("specialite", form.specialite);

      const res = await apiFetch("/users/profile", {
        method: "PUT",
        body: formData,
      });
      if (res.ok) {
        const updated = await res.json();
        onSaved(updated);
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      setError("Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="modal-header">
          <h3>✏️ Éditer le profil</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {error && (
            <p style={{ color: "#ef4444", marginBottom: "1rem", fontSize: "0.9rem" }}>
              {error}
            </p>
          )}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.85rem", color: "#64748b" }}>
              Prénom
            </label>
            <input
              type="text"
              value={form.prenom}
              onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.9rem",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: "0.95rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.85rem", color: "#64748b" }}>
              Nom
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.9rem",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: "0.95rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.85rem", color: "#64748b" }}>
              Spécialité
            </label>
            <input
              type="text"
              value={form.specialite}
              onChange={(e) => setForm((f) => ({ ...f, specialite: e.target.value }))}
              placeholder="ex: Cardiologue interventionnel"
              style={{
                width: "100%",
                padding: "0.6rem 0.9rem",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                fontSize: "0.95rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: 8,
                border: "1.5px solid #e2e8f0",
                background: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.6rem 1.4rem",
                borderRadius: 8,
                border: "none",
                background: saving ? "#94a3b8" : "#2563eb",
                color: "white",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Page Principale Profil ────────────────────────────────────────── */
export default function Profile() {
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [isUploading, setIsUploading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [dashStats, setDashStats] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
    fetchDashStats();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiGet(`/users/profile`);
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchDashStats = async () => {
    try {
      const res = await apiGet("/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setDashStats(data);
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
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
      const res = await apiFetch(`/users/profile`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUserProfile(updatedUser);
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
    : { ...doctorInfo, email: "" };

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Profile",
  }));

  // Stats réelles depuis le dashboard
  const stats = [
    {
      icon: "👥",
      label: "Patients suivis",
      value: dashStats ? String(dashStats.totalPatients) : "—",
    },
    {
      icon: "❤️",
      label: "Alertes urgentes",
      value: dashStats ? String(dashStats.urgentesCount) : "—",
    },
    {
      icon: "💬",
      label: "Messages non lus",
      value: dashStats ? String(dashStats.unreadMessagesCount) : "—",
    },
    {
      icon: "📅",
      label: "Spécialité",
      value: currentDoctor.specialty,
    },
  ];

  const infoRows = [
    { label: "Nom complet", value: currentDoctor.name, icon: "👤" },
    {
      label: "Email professionnel",
      value: currentDoctor.email || "—",
      icon: "📧",
    },
    { label: "Spécialité", value: currentDoctor.specialty, icon: "🫀" },
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
            <div
              className="profile-avatar-wrap"
              onClick={handleAvatarClick}
              style={{ cursor: "pointer" }}
            >
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
                {isUploading && (
                  <div className="profile-avatar-loader">...</div>
                )}
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
                style={{ display: "none" }}
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
                <span className="profile-tag profile-tag--green">✓ Vérifié</span>
              </div>
            </div>

            <div className="profile-hero-actions">
              <button
                className="profile-btn-primary"
                onClick={() => setIsPwdModalOpen(true)}
              >
                🔒 Modifier le mot de passe
              </button>
              <button
                className="profile-btn-secondary"
                onClick={() => setIsEditModalOpen(true)}
              >
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
                    Modifiez régulièrement votre mot de passe pour sécuriser
                    votre compte.
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
              {dashStats ? (
                <>
                  <div className="profile-activity-item">
                    <div className="profile-activity-icon">👥</div>
                    <div className="profile-activity-content">
                      <span className="profile-activity-action">
                        Patients suivis actuellement
                      </span>
                      <span className="profile-activity-patient">
                        {dashStats.totalPatients} patient(s) actif(s)
                      </span>
                    </div>
                  </div>
                  <div className="profile-activity-item">
                    <div className="profile-activity-icon">⚠️</div>
                    <div className="profile-activity-content">
                      <span className="profile-activity-action">
                        Alertes urgentes en attente
                      </span>
                      <span className="profile-activity-patient">
                        {dashStats.urgentesCount} alerte(s) urgente(s)
                      </span>
                    </div>
                  </div>
                  <div className="profile-activity-item">
                    <div className="profile-activity-icon">💬</div>
                    <div className="profile-activity-content">
                      <span className="profile-activity-action">
                        Messages non lus
                      </span>
                      <span className="profile-activity-patient">
                        {dashStats.unreadMessagesCount} message(s) non lu(s)
                      </span>
                    </div>
                  </div>
                  {dashStats.dernierECG && (
                    <div className="profile-activity-item">
                      <div className="profile-activity-icon">📈</div>
                      <div className="profile-activity-content">
                        <span className="profile-activity-action">
                          Dernier ECG reçu
                        </span>
                        <span className="profile-activity-patient">
                          Patient :{" "}
                          {dashStats.dernierECG.patient?.nom ||
                            "Inconnu"}{" "}
                          {dashStats.dernierECG.patient?.prenom || ""}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: "#94a3b8", padding: "1rem" }}>
                  Chargement de l'activité...
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPwdModalOpen}
        onClose={() => setIsPwdModalOpen(false)}
      />

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={userProfile}
        onSaved={(updated) => {
          setUserProfile(updated);
        }}
      />
    </MedicalLayout>
  );
}
