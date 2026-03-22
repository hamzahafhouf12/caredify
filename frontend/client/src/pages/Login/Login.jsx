import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import AuthLayout from "../../components/auth/AuthLayout"
import { ROLE_LABELS } from "../../constants/roles"
import "./Login.css"

function Login() {
  const { role } = useParams()
  const roleLabel = role ? ROLE_LABELS[role] : null
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
          onClick={() => navigate("/otp")}
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
