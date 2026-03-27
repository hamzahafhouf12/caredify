import { Link } from "react-router-dom"
import "./DashboardShell.css"

/**
 * En-tête et zone de contenu communs aux tableaux de bord.
 */
function DashboardShell({ title, description, children }) {
  return (
    <div className="dashboard-shell">
      <header className="dashboard-shell__header">
        <div className="dashboard-shell__brand-row">
          <Link to="/" className="dashboard-shell__brand">
            Caredify
          </Link>
          <nav className="dashboard-shell__nav" aria-label="Navigation principale">
            <Link to="/" className="dashboard-shell__link">
              Accueil
            </Link>
            <Link to="/login" className="dashboard-shell__link">
              Connexion
            </Link>
            <Link to="/register" className="dashboard-shell__link">
              Inscription
            </Link>
          </nav>
        </div>
        <h1 className="dashboard-shell__title">{title}</h1>
        {description ? (
          <p className="dashboard-shell__desc">{description}</p>
        ) : null}
      </header>
      <main className="dashboard-shell__main">{children}</main>
    </div>
  )
}

export default DashboardShell
