import DashboardShell from "../../components/layout/DashboardShell"
import "./AdminDashboard.css"

function AdminDashboard() {
  return (
    <DashboardShell
      title="Espace administrateur"
      description="Gestion des comptes, des cliniques et des paramètres globaux."
    >
      <section className="dashboard-placeholder admin-dashboard__body">
        <p>Contenu du tableau de bord admin à brancher sur l&apos;API.</p>
      </section>
    </DashboardShell>
  )
}

export default AdminDashboard
