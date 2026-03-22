import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import AdminDashboard from "./pages/AdminDashboard"
import CardiologueDashboard from "./pages/CardiologueDashboard"
import CliniqueDashboard from "./pages/CliniqueDashboard"
import RoleSelect from "./pages/RoleSelect"
import Register from "./pages/Register"
import OTPVerify from "./pages/OTPVerify"
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/login" element={<Login />} />
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