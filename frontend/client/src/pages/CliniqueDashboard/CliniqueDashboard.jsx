import DashboardShell from "../../components/layout/DashboardShell"
import "./CliniqueDashboard.css"

function CliniqueDashboard() {
  return (
    <DashboardShell
      title="Espace clinique"
      description="Vue d'ensemble de l'activité et des dossiers patients."
    >
      <section className="dashboard-placeholder clinique-dashboard__body">
        <p>Contenu du tableau de bord clinique à brancher sur l&apos;API.</p>
      </section>
    </DashboardShell>
  )
}

export default CliniqueDashboard
