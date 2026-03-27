import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login/Login"
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard"
import CardiologueDashboard from "./pages/CardiologueDashboard/CardiologueDashboard"
import CliniqueDashboard from "./pages/CliniqueDashboard/CliniqueDashboard"
import RoleSelect from "./pages/RoleSelect/RoleSelect"
import Register from "./pages/Register/Register"
import OTPVerify from "./pages/OTPVerify/OTPVerify"
import Patients from "./pages/Patients/Patients"
import AddPatient from "./pages/Patients/AddPatient"
import PatientFiche from "./pages/PatientFiche/PatientFiche"
import SignauxVitaux from "./pages/SignauxVitaux/SignauxVitaux"
import HistoriqueECG from "./pages/HistoriqueECG/HistoriqueECG"
import Alertes from "./pages/Alertes/Alertes"
import Messages from "./pages/Messages/Messages"
import Profile from "./pages/Profile/Profile"

import PrivateRoute from "./components/auth/PrivateRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/otp" element={<OTPVerify />} />
        
        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <PrivateRoute allowedRoles={["admin"]}><AdminDashboard /></PrivateRoute>
        } />
        
        {/* Protected Clinique Routes */}
        <Route path="/clinique" element={
          <PrivateRoute allowedRoles={["clinique", "admin"]}><CliniqueDashboard /></PrivateRoute>
        } />

        {/* Protected Cardiologue Routes */}
        <Route path="/cardiologue" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><CardiologueDashboard /></PrivateRoute>
        } />
        <Route path="/cardiologue/patients" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><Patients /></PrivateRoute>
        } />
        <Route path="/cardiologue/patients/add" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><AddPatient /></PrivateRoute>
        } />
        <Route path="/cardiologue/patients/:id" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><PatientFiche /></PrivateRoute>
        } />
        <Route path="/cardiologue/signaux-vitaux" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><SignauxVitaux /></PrivateRoute>
        } />
        <Route path="/cardiologue/signaux-vitaux/historique" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><HistoriqueECG /></PrivateRoute>
        } />
        <Route path="/cardiologue/alertes" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><Alertes /></PrivateRoute>
        } />
        <Route path="/cardiologue/messages" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><Messages /></PrivateRoute>
        } />
        <Route path="/cardiologue/profile" element={
          <PrivateRoute allowedRoles={["cardiologue", "admin"]}><Profile /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
