import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AlertToastContainer from "../medical/AlertToast";
import "./MedicalLayout.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function MedicalLayout({ children, breadcrumb, navItems, doctorInfo: initialDoctorInfo }) {
  const [userProfile, setUserProfile] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("appTheme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("appTheme", darkMode ? "dark" : "light");
    // Sync to body so non-layout pages (like HistoriqueECG) can read it easily
    if (darkMode) {
      document.body.classList.add("theme-dark");
    } else {
      document.body.classList.remove("theme-dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("caredify_token");
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };

    fetchProfile();
  }, []);

  // Use fetched profile if available, otherwise fallback to prop or empty object
  const activeDoctorInfo = userProfile
    ? {
        name: `Dr ${userProfile.prenom} ${userProfile.nom}`,
        specialty: userProfile.specialite || "Spécialiste en cardiologie",
        avatar: userProfile.avatar
          ? `${API_BASE_URL.replace("/api", "")}${userProfile.avatar}`
          : initialDoctorInfo?.avatar,
      }
    : initialDoctorInfo;

  return (
    <div className={`cdash ${darkMode ? "cdash--dark" : ""}`}>
      <AlertToastContainer />
      <Sidebar navItems={navItems} doctorInfo={activeDoctorInfo} />
      <div className="cdash-main">
        <Topbar
          breadcrumb={breadcrumb}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode(!darkMode)}
        />
        <div className="cdash-body">
          {typeof children === "function"
            ? children({ userProfile, setUserProfile, activeDoctorInfo })
            : children}
        </div>
      </div>
    </div>
  );
}

export default MedicalLayout;
