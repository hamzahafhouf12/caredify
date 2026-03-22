import React from 'react';
import { Eye } from 'lucide-react';
import './ListPages.css';

const AlertsList = () => {
  const alerts = [
    { id: '#ADM5801', name: 'Natali Craig', type: 'Modéré', address: 'Meadow Lane Oakland', status: 'Stable', doctor: 'Natali Craig', generated: 2 },
    { id: '#ADM5802', name: 'Kate Morrison', type: 'Critique', address: 'Bagner Avenue Ocala', status: 'Urgent', doctor: 'Andi Lane', generated: 5 },
    { id: '#ADM5803', name: 'Drew Cano', type: 'Vito', address: 'Lory San Francisco', status: 'Stable', doctor: 'Natali Craig', generated: 1 },
  ];

  return (
    <div className="list-page-container">
      <div className="list-header">
        <h2 className="table-title">Liste des alertes</h2>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom et prénom</th>
              <th>Type d'alerte</th>
              <th>Adresse</th>
              <th>État</th>
              <th>Médecin référent</th>
              <th>Alertes générées</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a, index) => (
              <tr key={index}>
                <td className="id-col">{a.id}</td>
                <td>{a.name}</td>
                <td>
                    <span className={`badge ${a.type === 'Critique' ? 'urgent' : ''}`}
                          style={{ backgroundColor: a.type === 'Critique' ? 'rgba(231, 76, 60, 0.1)' : '', 
                                   color: a.type === 'Critique' ? '#e74c3c' : '' }}>
                        {a.type}
                    </span>
                </td>
                <td>{a.address}</td>
                <td>{a.status}</td>
                <td>{a.doctor}</td>
                <td>{a.generated}</td>
                <td className="actions-col">
                    <button className="icon-btn edit" title="Voir fiche"><Eye size={16} /> Voir fiche</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlertsList;
