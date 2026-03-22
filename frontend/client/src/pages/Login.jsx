import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "./login.css"
import caredifyLogo from "../assets/caredify-logo.png"  // ← ton fichier logo

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()

  const [errorMSG, setErrorMSG] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMSG("")
    
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || "Erreur de connexion")
      }
      
      // Stockage des informations
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      
      console.log("Logged in:", data.user)
      
      // Redirection dynamique basée sur la route App.jsx (/admin, /clinique, /cardiologue)
      if (data.user.role === "admin") {
        navigate("/admin")
      } else if (data.user.role === "clinique") {
        navigate("/clinique")
      } else if (data.user.role === "cardiologue") {
        navigate("/cardiologue")
      } else {
        navigate("/")
      }
      
    } catch (err) {
      setErrorMSG(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`login-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="login-container">

        {/* LEFT PANEL */}
        <div className="login-left">

          {/* Logo + nom en haut à gauche */}
          <div className="brand-header">
            
            <span className="brand-name">Caredify</span>
          </div>

            <div className="login-form-area">
              <h2 className="login-title">Connexion</h2>
              <p className="login-subtitle">Bienvenue ! Veuillez vous connecter à votre compte</p>
              
              {errorMSG && <p className="error-message" style={{color: 'red', textAlign: 'center', marginBottom: '10px'}}>{errorMSG}</p>}

              <div className="login-form">
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

              <a href="#" className="forgot-link">Mot de passe oublié ?</a>

              <button
                className={`login-btn ${loading ? "loading" : ""}`}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : "Connexion"}
              </button>
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

export default Login