import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";
import { ROLES } from "../../constants/roles";
import { apiPost } from "../../utils/api";
import "./Register.css";

function Register() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.nom ||
      !form.prenom ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.role
    ) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await apiPost(`/auth/register`, {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      const text = await response.text();
      let data = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("Non-JSON response from backend:", text);
          setError("Erreur serveur inattendue (Format invalide)");
          return;
        }
      }

      console.log("Register Backend response:", {
        status: response.status,
        data,
      });

      if (!response.ok) {
        let errorMsg = "Erreur inconnue provenant du serveur";
        if (data.message) errorMsg = data.message;
        else if (data.error) errorMsg = data.error;
        else if (Object.keys(data).length > 0) errorMsg = JSON.stringify(data);
        else errorMsg = `Code d'erreur HTTP: ${response.status} (réponse vide)`;

        setError(errorMsg);
        return; // Do NOT navigate away on error
      }

      // Only navigate on true success
      navigate(`/login/${form.role}`);
    } catch (err) {
      setError(err.message || "Impossible de joindre le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout containerClassName="register-container">
      <h2 className="login-title">Inscription</h2>
      <p className="login-subtitle">
        Créez votre compte pour accéder à la plateforme
      </p>

      <form className="login-form" onSubmit={handleSubmit}>
        {error ? <p className="auth-form__error">{error}</p> : null}

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

        <p className="auth-form__footer">
          Déjà un compte ?{" "}
          <span onClick={() => navigate("/login")} className="forgot-link">
            Se connecter
          </span>
        </p>
      </form>
    </AuthLayout>
  );
}

export default Register;
