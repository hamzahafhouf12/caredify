import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";
import { ROLES } from "../../constants/roles";
import "./RoleSelect.css";

function RoleSelect() {
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  const handleSelect = (roleId) => {
    setSelected(roleId);
    setTimeout(() => {
      navigate(`/login/${roleId}`);
    }, 350);
  };

  return (
    <AuthLayout>
      <h2 className="login-title">Choix du rôle</h2>
      <p className="login-subtitle">
        Sélectionnez votre rôle pour continuer vers la connexion
      </p>

      <div className="role-list">
        {ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            className={`login-btn role-btn ${selected === role.id ? "role-selected" : ""}`}
            onClick={() => handleSelect(role.id)}
          >
            <span className="role-icon">{role.icon}</span>
            <span className="role-label">{role.label}</span>
            {selected === role.id ? (
              <span className="role-check">✓</span>
            ) : null}
          </button>
        ))}
      </div>
    </AuthLayout>
  );
}

export default RoleSelect;
