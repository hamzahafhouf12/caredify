import doctorAvatar from "../assets/doctor-avatar.png";

export const doctorInfo = {
  name: "Dr Kilani Chaoua",
  specialty: "Spécialiste en cardiologie",
  avatar: doctorAvatar,
};

export const navItems = [
  { icon: "📊", label: "Tableau De Board", path: "/cardiologue" },
  { icon: "👥", label: "Patients", path: "/cardiologue/patients" },
  { icon: "💓", label: "Signaux Vitaux", path: "/cardiologue/signaux-vitaux" },
  { icon: "⚠️", label: "Alertes", path: "/cardiologue/alertes" },
  { icon: "📥", label: "Boîte ECG", path: "/cardiologue/reception-ecg" },
  { icon: "💬", label: "Messages", path: "/cardiologue/messages" },
  { icon: "👤", label: "Profile", path: "/cardiologue/profile" },
  { icon: "🚪", label: "Déconnexion", path: "/" },
];
