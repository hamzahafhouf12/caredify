import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "./RoleSelect.css"
import caredifyLogo from "../assets/caredify-logo.png"

const roles = [
  { id: "admin",    label: "Admin",    icon: "🛡️" },
  { id: "medecin",  label: "Médecin",  icon: "🩺" },
  { id: "clinique", label: "Clinique", icon: "🏥" },
]

function RoleSelect() {
  const [darkMode, setDarkMode] = useState(false)
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()

  const handleSelect = (roleId) => {
    setSelected(roleId)
    setTimeout(() => {
      navigate(`/login/${roleId}`)
    }, 350)
  }

  return (
    <div className={`login-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="login-container">

        {/* LEFT PANEL */}
        <div className="login-left">
          <div className="brand-header">
            <span className="brand-name">Caredify</span>
          </div>

          <div className="login-form-area">
            <h2 className="login-title">Admin ou Médecin ?</h2>
            <p className="login-subtitle">
              Sélectionnez votre rôle pour continuer
            </p>

            <div className="role-list">
              {roles.map((role) => (
                <button
                  key={role.id}
                  className={`login-btn role-btn ${selected === role.id ? "role-selected" : ""}`}
                  onClick={() => handleSelect(role.id)}
                >
                  <span className="role-icon">{role.icon}</span>
                  <span className="role-label">{role.label}</span>
                  {selected === role.id && (
                    <span className="role-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-right">
          <div className="logo-area">
            <img
              src={caredifyLogo}
              alt="Caredify Logo"
              className="logo-icon"
            />
          </div>
        </div>

      </div>

      {/* Dark mode toggle */}
      <button
        className="theme-toggle"
        onClick={() => setDarkMode(!darkMode)}
        title="Changer de thème"
      >
        {darkMode ? "☀️" : "🌙"}
      </button>
    </div>
  )
}

export default RoleSelect