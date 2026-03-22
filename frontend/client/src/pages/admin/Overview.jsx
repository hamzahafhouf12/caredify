import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Users, Stethoscope, Bell, Activity, AlertTriangle } from 'lucide-react';
import './Overview.css';

const Overview = () => {
  // Mock data for charts
  const alertsData = [
    { date: '17 Mar', alerts: 4 },
    { date: '18 Mar', alerts: 7 },
    { date: '19 Mar', alerts: 5 },
    { date: '20 Mar', alerts: 9 },
    { date: '21 Mar', alerts: 6 },
    { date: '22 Mar', alerts: 10 },
    { date: '23 Mar', alerts: 8 },
  ];

  const ecgData = [
    { date: '17 Mar', count: 20 },
    { date: '18 Mar', count: 35 },
    { date: '19 Mar', count: 28 },
    { date: '20 Mar', count: 42 },
    { date: '21 Mar', count: 30 },
    { date: '22 Mar', count: 25 },
    { date: '23 Mar', count: 38 },
  ];

  const growthData = [
    { day: '1', patients: 12.0, doctors: 128 },
    { day: '2', patients: 12.5, doctors: 132 },
    { day: '3', patients: 13.0, doctors: 130 },
    { day: '4', patients: 13.2, doctors: 135 },
    { day: '5', patients: 13.5, doctors: 138 },
    { day: '6', patients: 13.8, doctors: 140 },
    { day: '7', patients: 14.2, doctors: 142 },
  ];

  const stats = [
    { label: 'Nombre des médecins', value: '14', color: '#5d5dff', icon: <Stethoscope size={24} /> },
    { label: 'Nombre total des patients', value: '385', color: '#3498db', icon: <Users size={24} /> },
    { label: 'Alertes urgentes', value: '8', color: '#e74c3c', icon: <AlertTriangle size={24} />, isUrgent: true },
    { label: 'ECG reçus', value: '128', color: '#2ecc71', icon: <Activity size={24} /> },
  ];

  return (
    <div className="overview-container">
      <div className="overview-header">
        <h2 className="section-title">Aujourd'hui : {new Date().toLocaleDateString('fr-FR')}</h2>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.isUrgent ? 'urgent' : ''}`} style={{ backgroundColor: stat.color }}>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <h3 className="stat-value">{stat.value}</h3>
            </div>
            <div className="stat-icon-bg">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS GRID */}
      <div className="charts-grid">
        {/* Alerts Chart */}
        <div className="chart-card">
          <h4 className="chart-title">Évolution des alertes critiques (7 derniers jours)</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={alertsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#a0a0b0', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a0a0b0', fontSize: 12}} />
                <Tooltip />
                <Line type="monotone" dataKey="alerts" stroke="#e74c3c" strokeWidth={3} dot={{ r: 4, fill: "#e74c3c" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ECG Chart */}
        <div className="chart-card">
          <h4 className="chart-title">Nombre d'ECGs enregistrés par jour (7 derniers jours)</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={ecgData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5d5dff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#5d5dff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#a0a0b0', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a0a0b0', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#5d5dff" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Combined Chart */}
        <div className="chart-card full-width">
          <h4 className="chart-title">Évolution des médecins et des patients sur 7 jours</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e8f0" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="patients" stroke="#3498db" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="doctors" stroke="#2980b9" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
