import React, { useState } from "react"
import MedicalLayout from "../../components/layout/MedicalLayout"
import { doctorInfo, navItems } from "../../constants/medical"
import ChangePasswordModal from "../../components/modals/ChangePasswordModal/ChangePasswordModal"
import "./Profile.css"

export default function Profile() {
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false)

  const themedNavItems = navItems.map(item => ({
    ...item,
    active: item.label === "Profile"
  }))

  return (
    <MedicalLayout 
      breadcrumb="Profile" 
      navItems={themedNavItems} 
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center">
        <div className="profile-wrapper">
          
          {/* Left: Avatar Block */}
          <div className="profile-left">
            <div className="profile-avatar-large">
              👨‍⚕️
            </div>
          </div>

          {/* Right: Info Block */}
          <div className="profile-right">
            <div className="profile-header">
              <h2>{doctorInfo.name}</h2>
              <span className="profile-id">ID: 1234</span>
            </div>

            <table className="profile-table">
              <tbody>
                <tr>
                  <td className="pf-label">Nom et prénom</td>
                  <td className="pf-value">{doctorInfo.name}</td>
                </tr>
                <tr>
                  <td className="pf-label">Email</td>
                  <td className="pf-value">kilani.chaoua@caredify.tn</td>
                </tr>
                <tr>
                  <td className="pf-label">Date de Naissance</td>
                  <td className="pf-value">19/02/1988</td>
                </tr>
                <tr>
                  <td className="pf-label">Spécialité</td>
                  <td className="pf-value">Cardiologue</td>
                </tr>
                <tr>
                  <td className="pf-label">Nombre des patients</td>
                  <td className="pf-value">12</td>
                </tr>
              </tbody>
            </table>

            <button className="profile-btn-edit" onClick={() => setIsPwdModalOpen(true)}>
              Modifier Le mot de passe
            </button>

            <p className="profile-security">Vos données sont chiffrées et sécurisées</p>
          </div>

        </div>
      </div>
      
      <ChangePasswordModal 
        isOpen={isPwdModalOpen} 
        onClose={() => setIsPwdModalOpen(false)} 
      />
    </MedicalLayout>
  )
}
