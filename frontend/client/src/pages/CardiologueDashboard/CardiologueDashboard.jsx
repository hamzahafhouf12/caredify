import DashboardShell from "../../components/layout/DashboardShell"
import "./CardiologueDashboard.css"

function CardiologueDashboard() {
  return (
    <DashboardShell
      title="Espace cardiologue"
      description="Suivi des patients et indicateurs de télésurveillance."
    >
      <section className="dashboard-placeholder cardiologue-dashboard__body">
        <p>Contenu du tableau de bord médecin à brancher sur l&apos;API.</p>
      </section>
    </DashboardShell>
  )
}

export default CardiologueDashboard
