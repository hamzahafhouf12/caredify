import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import caredifyLogo from "../../assets/Caredify-logo.png"
import ThemeToggle from "../../components/ThemeToggle"
import "./ResetPassword.css"

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

  // If we don't have email/otp, redirect back to login
  useEffect(() => {
    if (!email || !otp) {
      console.warn("No reset session found, redirecting to login")
      // In production we would navigate away, but for dev we might stay
    }
  }, [email, otp, navigate])

  const handleReset = async (e) => {
    e.preventDefault()
    
    if (!email || !otp) {
      setError("Session de réinitialisation invalide. Veuillez recommencer l'étape du code OTP.")
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
        body: JSON.stringify({ email, otp, newPassword: password }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => navigate("/login"), 3000)
      } else {
        setError(data.message || "Erreur lors de la réinitialisation")
      }
    } catch (err) {
      setError("Erreur de connexion au serveur. Vérifiez que le backend est lancé.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`reset-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="reset-card">
        <div className="reset-logo-container">
          <img src={caredifyLogo} alt="Caredify" className="reset-logo" />
        </div>

        <h2 className="reset-title">Changer Votre mot de passe</h2>
        
        {success ? (
          <div className="reset-success-message">
            <p className="success-icon">✅</p>
            <h3>Mot de passe changé !</h3>
            <p>Redirection vers la connexion dans quelques secondes...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="reset-form">
            <p className="reset-info">
              {email ? `Définition du nouveau mot de passe pour ${email}` : "Veuillez entrer votre nouveau mot de passe."}
            </p>

            <div className="reset-input-group">
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="reset-input"
              />
            </div>

            <div className="reset-input-group">
              <input
                type="password"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="reset-input"
              />
            </div>

            {error && <p className="reset-error-text">{error}</p>}

            <button
              type="submit"
              className={`reset-submit-btn ${loading ? "is-loading" : ""}`}
              disabled={loading}
            >
              {loading ? "Traitement..." : "Changer le mot de passe"}
            </button>
            
            <button 
              type="button" 
              className="reset-cancel-link"
              onClick={() => navigate("/login")}
            >
              Annuler
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
