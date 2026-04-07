import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import caredifyLogo from "../../assets/caredify-logo.png"
import ThemeToggle from "../../components/ThemeToggle"
import "./ResetPassword.css" // Reusing the same styling for consistency

function ResetPassword() {
  const [darkMode, setDarkMode] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { email, otp } = location.state || {}

  const handleReset = async (e) => {
    e.preventDefault()
    if (!email || !otp) {
      setError("Session expirée. Veuillez recommencer.")
      return
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => navigate("/login"), 3000)
      } else {
        setError(data.message || "Erreur lors de la réinitialisation")
      }
    } catch (err) {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`otp-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="otp-card">
        <div className="otp-logo-area">
          <img src={caredifyLogo} alt="Caredify" className="otp-logo" />
        </div>

        <h2 className="otp-title">Réinitialiser le mot de passe</h2>
        <p style={{ fontSize: "0.9rem", color: "#64748b", textAlign: "center", marginBottom: "1rem" }}>
          Entrez votre nouveau mot de passe ci-dessous.
        </p>

        {success ? (
          <div style={{ textAlign: "center", animation: "otpFadeUp 0.5s ease" }}>
            <p className="otp-resent" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
              ✅ Mot de passe modifié avec succès !
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>Redirection vers la page de connexion...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="otp-actions-container">
            <div className="input-group" style={{ width: "100%", marginBottom: "10px" }}>
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
            </div>
            <div className="input-group" style={{ width: "100%", marginBottom: "10px" }}>
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
            </div>

            {error ? <p className="otp-error">{error}</p> : null}

            <button
              type="submit"
              className={`otp-btn otp-btn-confirm ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? <span className="otp-spinner" /> : "Changer le mot de passe"}
            </button>
          </form>
        )}
      </div>

      <ThemeToggle
        darkMode={darkMode}
        onToggle={() => setDarkMode((d) => !d)}
      />
    </div>
  )
}

export default ResetPassword
