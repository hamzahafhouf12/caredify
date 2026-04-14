import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import MedicalLayout from "../../components/layout/MedicalLayout";
import { doctorInfo, navItems } from "../../constants/medical";
import "./Patients.css";

function AddPatient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    cin: "",
    nom: "",
    age: "",
    adresse: "",
    etat: "Stable",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("caredify_token");
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'ajout du patient");
      }

      navigate("/cardiologue/patients");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const themedNavItems = navItems.map((item) => ({
    ...item,
    active: item.label === "Patients",
  }));

  return (
    <MedicalLayout
      breadcrumb="Patients / Ajouter"
      navItems={themedNavItems}
      doctorInfo={doctorInfo}
    >
      <div className="cdash-center v2-patients-page">
        <div className="historique-header" style={{ marginBottom: "20px" }}>
          <Link to="/cardiologue/patients" className="historique-back-link">
            Retour à la liste
          </Link>
          <h1 className="cdash-page-title">Ajouter un Patient</h1>
        </div>

        <div
          className="cdash-card"
          style={{ maxWidth: "600px", padding: "30px", margin: "0 auto" }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {error && (
              <p style={{ color: "var(--cdash-danger)", textAlign: "center" }}>
                {error}
              </p>
            )}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  color: "var(--cdash-text-muted)",
                }}
              >
                CIN
              </label>
              <input
                type="text"
                name="cin"
                value={form.cin}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--cdash-border)",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  color: "var(--cdash-text-muted)",
                }}
              >
                Nom et Prénoms
              </label>
              <input
                type="text"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--cdash-border)",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  color: "var(--cdash-text-muted)",
                }}
              >
                Âge
              </label>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--cdash-border)",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  color: "var(--cdash-text-muted)",
                }}
              >
                Adresse
              </label>
              <input
                type="text"
                name="adresse"
                value={form.adresse}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--cdash-border)",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  color: "var(--cdash-text-muted)",
                }}
              >
                État
              </label>
              <select
                name="etat"
                value={form.etat}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--cdash-border)",
                  backgroundColor: "inherit",
                  color: "inherit",
                }}
              >
                <option value="Stable">Stable</option>
                <option value="Critique">Critique</option>
                <option value="Modéré">Modéré</option>
              </select>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
              style={{ marginTop: "15px" }}
            >
              {loading ? "..." : "Ajouter le patient"}
            </button>
          </form>
        </div>
      </div>
    </MedicalLayout>
  );
}

export default AddPatient;
