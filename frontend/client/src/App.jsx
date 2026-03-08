import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import AdminDashboard from "./pages/AdminDashboard"
import CardiologueDashboard from "./pages/CardiologueDashboard"
import CliniqueDashboard from "./pages/CliniqueDashboard"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/cardiologue" element={<CardiologueDashboard />} />
        <Route path="/clinique" element={<CliniqueDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App