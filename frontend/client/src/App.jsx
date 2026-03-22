import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login/Login"
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard"
import CardiologueDashboard from "./pages/CardiologueDashboard/CardiologueDashboard"
import CliniqueDashboard from "./pages/CliniqueDashboard/CliniqueDashboard"
import RoleSelect from "./pages/RoleSelect/RoleSelect"
import Register from "./pages/Register/Register"
import OTPVerify from "./pages/OTPVerify/OTPVerify"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/otp" element={<OTPVerify />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/cardiologue" element={<CardiologueDashboard />} />
        <Route path="/clinique" element={<CliniqueDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
