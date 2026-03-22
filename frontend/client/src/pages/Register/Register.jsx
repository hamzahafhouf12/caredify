import { useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthLayout from "../../components/auth/AuthLayout"
import { ROLES } from "../../constants/roles"
import "./Register.css"

function Register() {
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (
      !form.nom ||
      !form.prenom ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.role
    ) {
      setError("Veuillez remplir tous les champs.")
      return
    }

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.")
      return
    }

    setError("")
    setLoading(true)
    setTimeout(() => {
      console.log("Register:", form)
      setLoading(false)
      navigate("/")
    }, 1200)
  }

  return (
    <AuthLayout
      darkMode={darkMode}
      onToggleDark={() => setDarkMode((d) => !d)}
      containerClassName="register-container"
    >
      <h2 className="login-title">Inscription</h2>
      <p className="login-subtitle">
        Créez votre compte pour accéder à la plateforme
      </p>

      <form className="login-form" onSubmit={handleSubmit}>
        {error ? <p className="error-message">{error}</p> : null}

        <div className="input-row">
          <div className="input-group">
            <input
              type="text"
              name="nom"
              placeholder="Nom"
              value={form.nom}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              name="prenom"
              placeholder="Prénom"
              value={form.prenom}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="register-select"
            required
          >
            <option value="" disabled>
              Sélectionnez votre rôle
            </option>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirmer le mot de passe"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <button
          type="submit"
          className={`login-btn ${loading ? "loading" : ""}`}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : "Créer le compte"}
        </button>

        <p className="register-login-link">
          Déjà un compte ?{" "}
          <span
            onClick={() => navigate("/login")}
            className="forgot-link"
          >
            Se connecter
          </span>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Register
