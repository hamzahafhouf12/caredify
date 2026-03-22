import { useState } from "react"
import { useNavigate } from "react-router-dom"   // ✅ Ajout
import "./login.css"
import caredifyLogo from "../assets/caredify-logo.png"

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()                  // ✅ Ajout

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      console.log(email, password)
      setLoading(false)
      navigate("/")
    }, 1200)
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
            <h2 className="login-title">Connexion</h2>
            <p className="login-subtitle">Bienvenue ! Veuillez vous connecter à votre compte</p>

            {/* ✅ <form> au lieu de <div> */}
            <form className="login-form" onSubmit={handleSubmit}>

              <div className="input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <span onClick={() => navigate("/otp")} className="forgot-link" style={{ cursor:"pointer" }}>
               Mot de passe oublié ?
               </span>

              <button
                type="submit"
                className={`login-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Connexion"}
              </button>

              {/* ✅ Lien vers Register */}
              <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Pas encore de compte ?{" "}
                <span
                  onClick={() => navigate("/register")}
                  className="forgot-link"
                  style={{ cursor: "pointer" }}
                >
                  S'inscrire
                </span>
              </p>

            </form>
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

export default Login