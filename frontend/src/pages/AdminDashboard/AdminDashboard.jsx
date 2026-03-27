import DashboardRoleView from "../../components/dashboard/DashboardRoleView"

function AdminDashboard() {
  return (
    <DashboardRoleView
      title="Espace administrateur"
      description="Gestion des comptes, des cliniques et des paramètres globaux."
      placeholder="Contenu du tableau de bord admin à brancher sur l'API."
    />
  )
}

export default AdminDashboard
