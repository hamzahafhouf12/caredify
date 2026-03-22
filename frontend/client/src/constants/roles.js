/** Rôles applicatifs (URL + formulaires) */
export const ROLES = [
  { id: "admin", label: "Admin", icon: "🛡️" },
  { id: "medecin", label: "Médecin", icon: "🩺" },
  { id: "clinique", label: "Clinique", icon: "🏥" },
]

export const ROLE_LABELS = Object.fromEntries(
  ROLES.map((r) => [r.id, r.id === "admin" ? "Administrateur" : r.label])
)
