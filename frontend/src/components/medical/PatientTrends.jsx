import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import "./PatientTrends.css";

const PatientTrends = ({ historyData, period, onPeriodChange }) => {
  if (
    !historyData ||
    (!historyData.vitalsHistory?.length && !historyData.ecgHistory?.length)
  ) {
    return (
      <div className="trends-empty">
        <div className="trends-empty-content">
          <span>📊</span>
          <p>Pas assez de données historiques pour générer les tendances.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  };

  // Formatting vitals data (HR, HRV, SpO2)
  const vitalsData = historyData.vitalsHistory.map((v) => ({
    time: formatDate(v.createdAt),
    fullTime: new Date(v.createdAt).toLocaleString("fr-FR"),
    fc: v.frequenceCardiaque,
    hrv: v.hrv,
    spo2: v.spo2,
  }));

  // Formatting AI Risk Score data
  const aiData = historyData.ecgHistory.map((e) => ({
    time: formatDate(e.createdAt),
    score: e.iaInterpretations?.scoreRisque || 0,
    arythmie: e.iaInterpretations?.arythmie ? 1 : 0,
  }));

  // Episode analysis (Arrythmia vs Normal)
  const episodes = [
    {
      name: "Sinusal Normal",
      value: aiData.filter((d) => !d.arythmie).length,
      color: "#27ae60",
    },
    {
      name: "Épisodes Arythmie",
      value: aiData.filter((d) => d.arythmie).length,
      color: "#eb5757",
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}${entry.unit || ""}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="patient-trends">
      <div className="trends-header">
        <div className="trends-title-group">
          <h3>Historique & Analyse des Tendances</h3>
          <p>Suivi longitudinal : évolution clinique du patient</p>
        </div>
        
        <div className="trends-period-selector">
          {[
            { label: "7 jrs", value: 7 },
            { label: "30 jrs", value: 30 },
            { label: "90 jrs", value: 90 },
            { label: "Global", value: -1 },
          ].map((p) => (
            <button
              key={p.value}
              className={`period-btn ${period === p.value ? "active" : ""}`}
              onClick={() => onPeriodChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trends-grid">
        {/* Graphique 1: Fréquence Cardiaque & HRV */}
        <div className="trend-card">
          <div className="card-header">
            <h4>Évolution FC & HRV</h4>
            <span className="card-subtitle">Rythme et Variabilité (ms)</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vitalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="fc"
                  name="Fréq. Cardiaque"
                  stroke="#eb5757"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                  unit=" bpm"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="hrv"
                  name="HRV"
                  stroke="#2f80ed"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  unit=" ms"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 2: Score de Risque IA */}
        <div className="trend-card">
          <div className="card-header">
            <h4>Tendance Score de Risque (SG1)</h4>
            <span className="card-subtitle">
              Calculé par l'IA sur chaque ECG
            </span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={aiData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f2994a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f2994a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Score de Risque"
                  stroke="#f2994a"
                  fillOpacity={1}
                  fill="url(#colorScore)"
                  strokeWidth={3}
                  unit="%"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 3: SpO2 stability */}
        <div className="trend-card">
          <div className="card-header">
            <h4>Stabilité de l'Oxygène (SpO₂)</h4>
            <span className="card-subtitle">Saturation moyenne régulière</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vitalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="time" />
                <YAxis domain={[80, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="stepAfter"
                  dataKey="spo2"
                  name="Saturation SpO2"
                  stroke="#27ae60"
                  strokeWidth={3}
                  dot={false}
                  unit="%"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 4: Distribution des épisodes */}
        <div className="trend-card">
          <div className="card-header">
            <h4>Distribution des Résultats IA</h4>
            <span className="card-subtitle">
              Répartition normal vs anomalies
            </span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={episodes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Fréquence" radius={[8, 8, 0, 0]}>
                  {episodes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientTrends;
