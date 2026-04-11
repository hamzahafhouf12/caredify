import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import AuthLayout from "../../components/auth/AuthLayout"
import { ROLE_LABELS, getDashboardPathForRole } from "../../constants/roles"
import "./Login.css"

function Login() {
  const { role } = useParams()
  const roleLabel = role ? ROLE_LABELS[role] : null
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (role && !getDashboardPathForRole(role)) {
      navigate("/", { replace: true })
    }
  }, [role, navigate])

  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const text = await response.text()
      let data = {}

      try {
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error("Non-JSON response from backend:", text)
        throw new Error("Erreur serveur irrécupérable (Format invalide)")
      }

      console.log("Login Backend response:", { status: response.status, data })

      if (!response.ok) {
        let errorMsg = "Email ou mot de passe incorrect";
        if (data.message) errorMsg = data.message;
        else if (data.error) errorMsg = data.error;
        else if (Object.keys(data).length > 0) errorMsg = JSON.stringify(data);
        else errorMsg = `Code d'erreur HTTP: ${response.status} (réponse vide)`;
        
        setError(errorMsg)
        return // Do NOT navigate away on error
      }

      // Save token and user info to localStorage
      localStorage.setItem("caredify_token", data.token)
      localStorage.setItem("caredify_user", JSON.stringify(data))

      // Redirect to correct dashboard based on role (or URL param if forced)
      const userRole = role || data.role
      const dashboard = getDashboardPathForRole(userRole)
      navigate(dashboard ?? "/")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="login-title">Connexion</h2>
      <p className="login-subtitle">
        {roleLabel
          ? `Connexion en tant que ${roleLabel}.`
          : "Bienvenue ! Veuillez vous connecter à votre compte"}
      </p>
      {roleLabel ? (
        <p className="login-page__switch-role">
          <span
            className="forgot-link"
            onClick={() => navigate("/")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("/")
            }}
          >
            Changer de rôle
          </span>
        </p>
      ) : null}

      <form className="login-form" onSubmit={handleSubmit}>
        {error ? <p className="auth-form__error">{error}</p> : null}

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

        <span
          onClick={() => {
            if (!email) {
              setError("Veuillez saisir votre email avant de cliquer sur 'Mot de passe oublié'.")
              return
            }
            navigate("/otp", { state: { email } })
          }}
          className="forgot-link login-page__forgot"
        >
          Mot de passe oublié ?
        </span>

        <button
          type="submit"
          className={`login-btn ${loading ? "loading" : ""}`}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : "Connexion"}
        </button>

        <p className="auth-form__footer">
          Pas encore de compte ?{" "}
          <span
            onClick={() => navigate("/register")}
            className="forgot-link"
          >
            S&apos;inscrire
          </span>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login
