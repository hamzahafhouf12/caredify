import React from 'react';
import { Search, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';

const MedecinsList = () => {
  const doctors = [
    { id: '#ADM5801', name: 'Natali Craig', email: 'natali.craig@caredify.tn', specialty: 'Cardiologue', date: '17/08/2023 - 09:00 AM', alerts: 4, patients: 14 },
    { id: '#ADM5902', name: 'Kate Morrison', email: 'kate.morrison@caredify.tn', specialty: 'Cardiologue', date: '21/08/2023 - 10:30 AM', alerts: 5, patients: 9 },
    { id: '#ADM5903', name: 'Drew Cano', email: 'drew.cano@caredify.tn', specialty: 'Cardiologue', date: '24/03/2023 - 11:00 AM', alerts: 3, patients: 23 },
    { id: '#ADM5904', name: 'Orlando Diggs', email: 'orlando.diggs@caredify.tn', specialty: 'Cardiologue', date: '30/03/2023 - 08:30 AM', alerts: 2, patients: 40 },
    { id: '#ADM5905', name: 'Andi Lane', email: 'andi.lane@caredify.tn', specialty: 'Cardiologue', date: '10/04/2023 - 03:00 PM', alerts: 0, patients: 15 },
  ];

  return (
    <div className="list-page-container">
      <div className="list-header">
        <h2 className="table-title">Liste de médecins</h2>
        <button className="add-btn"><Plus size={18} /> Ajouter</button>
      </div>

      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom et prénom</th>
              <th>Email</th>
              <th>Spécialité</th>
              <th>Date de création de compte</th>
              <th>Nombre des alertes générées</th>
              <th>Nombre des patients suivis</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((dr, index) => (
              <tr key={index}>
                <td className="id-col">{dr.id}</td>
                <td className="name-col">
                  <div className="user-info-cell">
                    <div className="user-avatar-tiny" />
                    <span>{dr.name}</span>
                  </div>
                </td>
                <td className="email-col">{dr.email}</td>
                <td><span className="badge">{dr.specialty}</span></td>
                <td>{dr.date}</td>
                <td>{dr.alerts}</td>
                <td>{dr.patients}</td>
                <td className="actions-col">
                    <button className="icon-btn edit"><Edit size={16} /></button>
                    <button className="icon-btn delete"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MedecinsList;
