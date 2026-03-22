import React from 'react';
import { useNavigate } from 'react-router-dom';

function CardiologueDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dashboard Cardiologue</h1>
      <p>Bienvenue, {user.name} ({user.email})</p>
      <button onClick={handleLogout} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>Déconnexion</button>
    </div>
  );
}

export default CardiologueDashboard;
