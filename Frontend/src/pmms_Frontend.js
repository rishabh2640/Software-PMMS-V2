import React, { useState, useEffect } from 'react';
import { Settings, Eye, Plus, List, ChevronRight, Trash2, Edit, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000';

// --- Machine Card Component (Standard Light Mode) ---
const MachineCard = ({ machine }) => {
  const isOn = machine.current_status === 'on' || machine.current_status === 'running'; // true if ->
  const efficiency = machine.efficiency_percentage || 0; // The || 0 is a fallback (default value)

  const getEfficiencyColor = (eff) => { // logic of color : alertCircle
    if (eff >= 80) return 'text-success';
    if (eff >= 60 && eff < 80) return 'text-warning';
    return 'text-danger';
  };

  const formatTime = (minutes) => {
    if (!minutes && minutes !== 0) return '00:00'; // Handling Missing Data - safety check
    const hours = Math.floor(minutes / 60); // Calculating Hours
    const mins = minutes % 60; // Calculate Minutes
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`; // padStart(2, '0') ensures the number is always at least 2 digits long.
  };

  return (
    <div className="card h-100 shadow-sm border-0">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>ID : {machine.machine_id}</small>
            <h5 className="card-title fw-bold text-dark mb-0">{machine.machine_name}</h5>
          </div>
          {/* <div className="dropdown">
            <Settings className="text-muted" size={18} style={{ cursor: 'pointer' }} />
          </div> */}
        </div>

        <div className="d-flex align-items-center justify-content-between m-2">
          <div className="position-relative">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: '100px', height: '100px',
                backgroundColor: isOn ? '#e8f5e9' : '#ffebee',
                border: `2px solid ${isOn ? '#4caf50' : '#f44336'}`
              }}
            >
              <span className={`fw-bold ${isOn ? 'text-success' : 'text-danger'}`}>
                {isOn ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          <div className="col px-4 text-start">
            <div className="mb-4">
              <small className="text-secondary fw-semibold">Efficiency</small>
              <h1 className={`fw-bold mb-0 lh-1 ${getEfficiencyColor(efficiency)}`}>
                {efficiency}%
              </h1>
            </div>

            {/* Type Specific Value Display Removed */}

            <div className="row g-3" style={{ minHeight: '60px' }}>
              {/* Late Start Section - Visible only if > 0, else reserves space */}
              <div className="col-6">
                <div className={`p-2 rounded bg-light border-start border-4 border-warning h-100 ${machine.late_start_minutes > 0 ? '' : 'invisible'}`}>
                  <small className="text-secondary d-block lh-1 mb-1">Late Start</small>
                  <div className="d-flex align-items-baseline text-dark">
                    <span className="fw-bold fs-6">{formatTime(machine.late_start_minutes || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Early Stop Section - Visible only if > 0, else reserves space */}
              <div className="col-6">
                <div className={`p-2 rounded bg-light border-start border-4 border-danger h-100 ${machine.early_stop_minutes > 0 ? '' : 'invisible'}`}>
                  <small className="text-secondary d-block lh-1 mb-1">Early Stop</small>
                  <div className="d-flex align-items-baseline text-dark">
                    <span className="fw-bold fs-6">{formatTime(machine.early_stop_minutes || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-top p-2 m-2">
        <div className="d-flex justify-content-between mb-3">
          <span className="text-muted small">Total On Time:</span>
          <span className="fw-bold small text-dark">{formatTime(machine.total_on_time_minutes)}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-muted small">Total Off Time:</span>
          <span className="fw-bold small text-dark">{formatTime(machine.total_off_time_minutes)}</span>
        </div>
      </div>

      <button className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center gap-2 m-2">
        View Details <ChevronRight size={14} />
      </button>
    </div >
  );
};

// --- Monitoring Page with Error Handling ---
const MonitoringPage = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveData = async () => {
    try {
      console.log('Fetching data from:', `${API_BASE_URL}/get_live_data_of_all_machine`);

      const response = await fetch(`${API_BASE_URL}/get_live_data_of_all_machine`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);

      if (data.success) {
        setMachines(data.data);
        setError(null);
      } else {
        setError('Failed to fetch machine data');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-muted">Loading machines...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger d-flex align-items-center" role="alert">
        <AlertCircle size={24} className="me-3" />
        <div>
          <h5 className="alert-heading mb-1">Connection Error</h5>
          <p className="mb-2">{error}</p>
          <hr />
          <p className="mb-0 small">
            <strong>Possible solutions:</strong>
            <ol className="mb-0 mt-2">
              <li>Make sure your backend server is running on http://localhost:3000</li>
              <li>Check if CORS is enabled on your backend. Add this to your backend:
                <pre className="bg-dark text-white p-2 rounded mt-2 small">
                  {`const cors = require('cors');
                    app.use(cors());`}
                </pre>
              </li>
              <li>Open browser console (F12) to see detailed errors</li>
            </ol>
          </p>
          <button onClick={fetchLiveData} className="btn btn-sm btn-outline-danger mt-3">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {machines.map((machine) => (
        <div className="col-12 col-md-6 col-lg-4" key={machine.machine_id}>
          <MachineCard machine={machine} />
        </div>
      ))}
      {machines.length === 0 && (
        <div className="col-12 text-center py-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5">
              <AlertCircle size={48} className="text-muted mb-3" />
              <h5 className="text-muted">No machines configured</h5>
              <p className="text-muted">Use the Configuration tab to add machines.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Configuration View Components ---
const AddMachineForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    machine_id: '',
    machine_name: '',
    machine_type: 'onoff',
    scheduled_start_time: '09:00',
    scheduled_stop_time: '18:00',
    part_per_hour: '',
    idle_current: '',
    on_current: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!formData.machine_id || !formData.machine_name) {
      setError('Please fill in Machine ID and Machine Name');
      return;
    }

    const payload = {
      machine_id: formData.machine_id,
      machine_name: formData.machine_name,
      machine_type: formData.machine_type,
      scheduled_start_time: formData.scheduled_start_time,
      scheduled_stop_time: formData.scheduled_stop_time
    };

    if (formData.machine_type === 'counter') {
      payload.part_per_hour = parseInt(formData.part_per_hour) || 0;
    } else if (formData.machine_type === 'current') {
      payload.idle_current = parseFloat(formData.idle_current) || 0;
      payload.on_current = parseFloat(formData.on_current) || 0;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log('Submitting:', payload);
      const response = await fetch(`${API_BASE_URL}/create_new_machine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Machine added successfully!');
        onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add machine');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label small fw-bold">Machine ID *</label>
          <input
            type="text"
            className="form-control"
            placeholder="M001"
            value={formData.machine_id}
            onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold">Machine Name *</label>
          <input
            type="text"
            className="form-control"
            placeholder="Drill Press A"
            value={formData.machine_name}
            onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold">Machine Type</label>
          <select
            className="form-select"
            value={formData.machine_type}
            onChange={(e) => setFormData({ ...formData, machine_type: e.target.value })}
          >
            <option value="onoff">On/Off</option>
            <option value="counter">Counter</option>
            <option value="current">Current</option>
          </select>
        </div>
        <div className="col-md-6">
          {formData.machine_type === 'counter' && (
            <>
              <label className="form-label small fw-bold">Parts Per Hour</label>
              <input
                type="number"
                className="form-control"
                value={formData.part_per_hour}
                onChange={(e) => setFormData({ ...formData, part_per_hour: e.target.value })}
              />
            </>
          )}
        </div>
        {formData.machine_type === 'current' && (
          <>
            <div className="col-md-6">
              <label className="form-label small fw-bold">Idle Current (A)</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={formData.idle_current}
                onChange={(e) => setFormData({ ...formData, idle_current: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold">On Current (A)</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={formData.on_current}
                onChange={(e) => setFormData({ ...formData, on_current: e.target.value })}
              />
            </div>
          </>
        )}
        <div className="col-md-6">
          <label className="form-label small fw-bold">Daily Start Time</label>
          <input
            type="time"
            className="form-control"
            value={formData.scheduled_start_time}
            onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label small fw-bold">Daily Stop Time</label>
          <input
            type="time"
            className="form-control"
            value={formData.scheduled_stop_time}
            onChange={(e) => setFormData({ ...formData, scheduled_stop_time: e.target.value })}
          />
        </div>
        <div className="col-12 d-flex gap-2 pt-3">
          <button
            className="btn btn-primary px-4"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Adding...' : 'Add Machine'}
          </button>
          <button className="btn btn-light border" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const MachineList = ({ onEdit }) => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_all_machines_info`);
      const data = await response.json();
      console.log('Machine list:', data);
      if (data.success) setMachines(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching machines:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (machineId) => {
    if (!window.confirm(`Delete machine ${machineId}?`)) return;

    try {
      await fetch(`${API_BASE_URL}/delete_machine_by_ID/${machineId}`, {
        method: 'DELETE'
      });
      fetchMachines();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle">
        <thead className="table-light">
          <tr>
            <th>Name/ID</th>
            <th>Type</th>
            <th>Schedule</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {machines.map(m => (
            <tr key={m.machine_id}>
              <td>
                <div className="fw-bold">{m.machine_name}</div>
                <div className="text-muted small">{m.machine_id}</div>
              </td>
              <td><span className="badge bg-secondary">{m.machine_type}</span></td>
              <td className="small">{m.scheduled_start_time} - {m.scheduled_stop_time}</td>
              <td className="text-end">
                <button className="btn btn-sm btn-link text-primary me-2" onClick={() => onEdit(m)}>
                  <Edit size={16} />
                </button>
                <button className="btn btn-sm btn-link text-danger" onClick={() => handleDelete(m.machine_id)}>
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {machines.length === 0 && (
        <div className="text-center text-muted py-4">No machines found. Add one using the form.</div>
      )}
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [currentPage, setCurrentPage] = useState('monitoring');
  const [activeConfigView, setActiveConfigView] = useState('list');

  return (
    <div className="bg-light min-vh-100">
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm py-3 mb-4">
        <div className="container">
          <span className="navbar-brand fw-bold text-primary fs-4">PMMS</span>

          <div className="d-flex bg-light rounded-pill p-1">
            <button
              onClick={() => setCurrentPage('monitoring')}
              className={`btn rounded-pill px-4 btn-sm ${currentPage === 'monitoring' ? 'btn-white shadow-sm bg-white fw-bold' : 'btn-link text-decoration-none text-muted'}`}
            >
              <Eye size={16} className="me-2" /> Monitoring
            </button>
            <button
              onClick={() => setCurrentPage('configuration')}
              className={`btn rounded-pill px-4 btn-sm ${currentPage === 'configuration' ? 'btn-white shadow-sm bg-white fw-bold' : 'btn-link text-decoration-none text-muted'}`}
            >
              <Settings size={16} className="me-2" /> Configuration
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        {currentPage === 'monitoring' ? (
          <MonitoringPage />
        ) : (
          <div className="row">
            <div className="col-lg-3 mb-4">
              <div className="list-group border-0 shadow-sm">
                <button
                  onClick={() => setActiveConfigView('list')}
                  className={`list-group-item list-group-item-action border-0 py-3 ${activeConfigView === 'list' ? 'active bg-primary' : ''}`}
                >
                  <List size={18} className="me-2" /> Machine List
                </button>
                <button
                  onClick={() => setActiveConfigView('add')}
                  className={`list-group-item list-group-item-action border-0 py-3 ${activeConfigView === 'add' ? 'active bg-primary' : ''}`}
                >
                  <Plus size={18} className="me-2" /> Add New Machine
                </button>
              </div>
            </div>

            <div className="col-lg-9">
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  {activeConfigView === 'list' && <MachineList onEdit={() => setActiveConfigView('add')} />}
                  {activeConfigView === 'add' && <AddMachineForm onSuccess={() => setActiveConfigView('list')} onCancel={() => setActiveConfigView('list')} />}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;