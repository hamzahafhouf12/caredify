import React from 'react';
import { Search, Plus, Eye } from 'lucide-react';
import './ListPages.css';

const PatientsList = () => {
  const patients = [
    { id: '#DM5001', name: 'Natali Craig', age: 29, address: 'Meadow Lane Oakland', status: 'Stable', doctor: 'Natali Craig', alerts: 2 },
    { id: '#DM5002', name: 'Kate Morrison', age: 45, address: 'Lory San Francisco', status: 'Stable', doctor: 'Andi Lane', alerts: 1 },
    { id: '#DM5003', name: 'Drew Cano', age: 38, address: 'Bagner Avenue Ocala', status: 'Critique', doctor: 'Natali Craig', alerts: 12 },
    { id: '#DM5004', name: 'Orlando Diggs', age: 57, address: 'Washtunn Beton Rouge', status: 'Critique', doctor: 'Natali Craig', alerts: 22 },
  ];

  return (
    <div className="list-page-container">
      <div className="list-header">
        <h2 className="table-title">Liste de patients</h2>
        <button className="add-btn"><Plus size={18} /> Ajouter</button>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom et prénom</th>
              <th>Age</th>
              <th>Adresse</th>
              <th>État</th>
              <th>Médecin référent</th>
              <th>Nombre des alertes générées</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p, index) => (
              <tr key={index}>
                <td className="id-col">{p.id}</td>
                <td className="name-col">
                  <div className="user-info-cell">
                    <div className="user-avatar-tiny" />
                    <span>{p.name}</span>
                  </div>
                </td>
                <td>{p.age}</td>
                <td>{p.address}</td>
                <td>
                  <span className={`badge ${p.status === 'Critique' ? 'urgent' : ''}`} 
                        style={{ backgroundColor: p.status === 'Critique' ? 'rgba(231, 76, 60, 0.1)' : '', 
                                 color: p.status === 'Critique' ? '#e74c3c' : '' }}>
                    {p.status}
                  </span>
                </td>
                <td>{p.doctor}</td>
                <td>{p.alerts}</td>
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

export default PatientsList;
