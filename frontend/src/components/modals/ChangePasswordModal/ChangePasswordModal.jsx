import React from 'react'
import './ChangePasswordModal.css'

export default function ChangePasswordModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="pwd-modal-overlay" onClick={onClose}>
      <div className="pwd-modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="pwd-modal-title">Changer Votre mot de passe</h2>
        
        <form className="pwd-modal-form" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <input 
            type="password" 
            placeholder="Ancien mot de passe" 
            className="pwd-input" 
            required 
          />
          <input 
            type="password" 
            placeholder="Nouveau mot de passe" 
            className="pwd-input" 
            required 
          />
          <input 
            type="password" 
            placeholder="Confirmer le nouveau mot de passe" 
            className="pwd-input" 
            required 
          />
          
          <button type="submit" className="pwd-submit-btn">
            Changer le mot de passe
          </button>
        </form>
      </div>
    </div>
  )
}
