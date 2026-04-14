import DashboardShell from "../layout/DashboardShell";

/**
 * Tableau de bord générique : évite de répéter le même JSX sur chaque rôle.
 */
function DashboardRoleView({ title, description, placeholder }) {
  return (
    <DashboardShell title={title} description={description}>
      <section className="dashboard-placeholder">
        <p>{placeholder}</p>
      </section>
    </DashboardShell>
  );
}

export default DashboardRoleView;
