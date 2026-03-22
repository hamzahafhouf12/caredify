import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import AdminLayout from "./components/AdminLayout"
import Overview from "./pages/admin/Overview"
import MedecinsList from "./pages/admin/MedecinsList"
import PatientsList from "./pages/admin/PatientsList"
import AlertsList from "./pages/admin/AlertsList"
import ProfileView from "./pages/admin/ProfileView"
import CardiologueDashboard from "./pages/CardiologueDashboard"
import CliniqueDashboard from "./pages/CliniqueDashboard"
import RoleSelect from "./pages/RoleSelect"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login" element={<Login />} />
        
        {/* Admin Dashboard with Nested Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="medecins" element={<MedecinsList />} />
          <Route path="patients" element={<PatientsList />} />
          <Route path="alertes" element={<AlertsList />} />
          <Route path="profil" element={<ProfileView />} />
        </Route>

        <Route path="/cardiologue" element={<CardiologueDashboard />} />
        <Route path="/clinique" element={<CliniqueDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App