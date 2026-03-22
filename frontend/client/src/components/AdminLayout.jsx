import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Stethoscope, 
  Users, 
  Bell, 
  LogOut, 
  User as UserIcon, 
  Search, 
  Moon, 
  Sun,
  ShieldCheck,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import './AdminLayout.css';
import caredifyLogo from '../assets/caredify-logo.png';

const AdminLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const navigate = useNavigate();
  const location = useLocation();
  // const user = JSON.parse(localStorage.getItem('user')) || { name: 'Admin', role: 'admin' };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const navItems = [
    { name: 'Tableau De Bord', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Médecins', icon: <Stethoscope size={20} />, path: '/admin/medecins' },
    { name: 'Patients', icon: <Users size={20} />, path: '/admin/patients' },
    { name: 'Alertes globales', icon: <Bell size={20} />, path: '/admin/alertes' },
    { name: 'Profil', icon: <UserIcon size={20} />, path: '/admin/profil' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className={`admin-dashboard-wrapper ${darkMode ? 'dark' : ''}`}>
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="admin-profile-card">
            <div className="profile-avatar">
              <UserIcon size={40} />
            </div>
            <div className="profile-info">
              <h3 className="profile-name">Radhia Bensaed</h3>
              <p className="profile-role">Admin</p>
            </div>
          </div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.name}</span>
                {isActive && <div className="active-indicator" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="nav-item logout-btn">
            <span className="nav-icon"><LogOut size={20} /></span>
            <span className="nav-label">Déconnexion</span>
          </button>
          
          <div className="sidebar-logo">
            <img src={caredifyLogo} alt="Caredify" />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="admin-main">
        {/* TOPBAR */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
              <Menu size={24} />
            </button>
            <div className="breadcrumbs">
              <span className="breadcrumb-path">Tableau de bord</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input type="text" placeholder="Recherche..." />
            </div>
            
            <div className="topbar-actions">
              <button 
                className="action-btn theme-toggle" 
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? "Mode clair" : "Mode sombre"}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <button className="action-btn notifications">
                <Bell size={20} />
                <span className="notif-badge">3</span>
              </button>

              <div className="user-dropdown">
                <span className="user-name">Radhia</span>
                <UserIcon size={24} className="user-avatar-small" />
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT PAGE */}
        <section className="admin-content-outlet">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default AdminLayout;
