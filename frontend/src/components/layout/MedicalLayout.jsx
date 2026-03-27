import React, { useState, useEffect } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import "./MedicalLayout.css"

function MedicalLayout({ children, breadcrumb, navItems, doctorInfo }) {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("appTheme") === "dark"
  })

  useEffect(() => {
    localStorage.setItem("appTheme", darkMode ? "dark" : "light")
    // Sync to body so non-layout pages (like HistoriqueECG) can read it easily
    if (darkMode) {
      document.body.classList.add("theme-dark")
    } else {
      document.body.classList.remove("theme-dark")
    }
  }, [darkMode])

  return (
    <div className={`cdash ${darkMode ? "cdash--dark" : ""}`}>
      <Sidebar navItems={navItems} doctorInfo={doctorInfo} />
      <div className="cdash-main">
        <Topbar 
          breadcrumb={breadcrumb} 
          darkMode={darkMode} 
          onToggleTheme={() => setDarkMode(!darkMode)} 
        />
        <div className="cdash-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default MedicalLayout
