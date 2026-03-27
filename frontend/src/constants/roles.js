/** Rôles applicatifs (URL + formulaires) */
export const ROLES = [
  { id: "admin", label: "Admin", icon: "🛡️" },
  { id: "cardiologue", label: "Cardiologue", icon: "🩺" },
  { id: "clinique", label: "Clinique", icon: "🏥" },
]

export const ROLE_LABELS = Object.fromEntries(
  ROLES.map((r) => [r.id, r.id === "admin" ? "Administrateur" : r.label])
)
ROLE_LABELS.medecin = "Cardiologue" // Legacy support

/** Route du tableau de bord pour chaque rôle (URL stable) */
export const ROLE_DASHBOARD_PATH = {
  admin: "/admin",
  cardiologue: "/cardiologue",
  medecin: "/cardiologue", // Legacy support
  clinique: "/clinique",
}

export function getDashboardPathForRole(roleId) {
  if (!roleId) return null
  return ROLE_DASHBOARD_PATH[roleId] ?? null
}
