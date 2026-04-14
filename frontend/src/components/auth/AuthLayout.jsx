import { useState } from "react";
import caredifyLogo from "../../assets/caredify-logo.png";
import "./auth-shell.css";
import ThemeToggle from "../ThemeToggle";

/**
 * Mise en page commune : panneau formulaire + panneau logo (écrans auth / choix rôle).
 * Le thème clair/sombre est géré ici pour éviter de le dupliquer sur chaque page.
 */
function AuthLayout({ containerClassName, children }) {
  const [darkMode, setDarkMode] = useState(false);
  const containerClass = ["login-container", containerClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`login-wrapper ${darkMode ? "dark" : ""}`}>
      <div className={containerClass}>
        <div className="login-left">
          <div className="brand-header">
            <span className="brand-name">Caredify</span>
          </div>
          <div className="login-form-area">{children}</div>
        </div>
        <div className="login-right">
          <div className="logo-area">
            <img src={caredifyLogo} alt="Caredify" className="logo-icon" />
          </div>
        </div>
      </div>
      <ThemeToggle
        darkMode={darkMode}
        onToggle={() => setDarkMode((d) => !d)}
      />
    </div>
  );
}

export default AuthLayout;
