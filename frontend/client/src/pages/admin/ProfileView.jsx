import React from 'react';
import { User, Mail, Calendar, Shield, Lock } from 'lucide-react';
import './ProfileView.css';

const ProfileView = () => {
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Radhia Bensaed', email: 'radhia.bensaed@caredify.tn', role: 'admin' };

  return (
    <div className="profile-page-container">
      <div className="profile-header">
        <div className="profile-large-avatar">
          <User size={60} />
        </div>
        <div className="profile-title-group">
          <h2 className="display-name">{user.name}</h2>
          <span className="role-tag">{user.role}</span>
          <p className="admin-id">ID: 1234</p>
        </div>
      </div>

      <div className="profile-details-grid">
        <div className="detail-card">
          <div className="detail-item">
            <User className="detail-icon" />
            <div className="detail-content">
              <label>Nom et prénom</label>
              <p>{user.name}</p>
            </div>
          </div>
          <div className="detail-item">
            <Mail className="detail-icon" />
            <div className="detail-content">
              <label>Email</label>
              <p>{user.email}</p>
            </div>
          </div>
          <div className="detail-item">
            <Calendar className="detail-icon" />
            <div className="detail-content">
              <label>Date de Naissance</label>
              <p>19/02/1998</p>
            </div>
          </div>
        </div>

        <div className="security-card">
          <button className="change-pass-btn">
            <Lock size={18} /> Modifier le mot de passe
          </button>
          <div className="security-notice">
            <Shield size={24} />
            <p>Vos données sont chiffrées et sécurisées</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
