import React, { useState, useEffect } from 'react';
import { Settings, Eye, Plus, List, ChevronRight, Trash2, Edit, AlertCircle, ArrowLeft } from 'lucide-react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3000';

// --- Machine Card Component (Standard Light Mode) ---
const MachineCard = ({ machine }) => {
  const navigate = useNavigate();
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

      <button
        className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-center gap-2 m-2"
        onClick={() => navigate(`/machine/${machine.machine_id}`)}
      >
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
const AddMachineForm = ({ initialData, onSuccess, onCancel }) => {
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

  useEffect(() => {
    if (initialData) {
      setFormData({
        machine_id: initialData.machine_id,
        machine_name: initialData.machine_name,
        machine_type: initialData.machine_type,
        scheduled_start_time: initialData.scheduled_start_time,
        scheduled_stop_time: initialData.scheduled_stop_time,
        part_per_hour: initialData.part_per_hour || '',
        idle_current: initialData.idle_current || '',
        on_current: initialData.on_current || ''
      });
    }
  }, [initialData]);

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
      let response;

      if (initialData) {
        // Update existing machine
        response = await fetch(`${API_BASE_URL}/update_machine_info_by_ID/${formData.machine_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new machine
        response = await fetch(`${API_BASE_URL}/create_new_machine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        alert(initialData ? 'Machine updated successfully!' : 'Machine added successfully!');
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
            disabled={!!initialData} // Disable ID editing
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
            disabled={!!initialData} // Disable Type editing
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
            {submitting ? 'Saving...' : (initialData ? 'Update Machine' : 'Add Machine')}
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

// --- Helper to format date as DD-MM-YYYY ---
const formatDateDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Helper to format seconds into HH:MM:SS
const formatSeconds = (totalSeconds) => {
  if (totalSeconds === null || isNaN(totalSeconds)) return '--:--';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Helper to parse duration string (e.g., "01:30:00") into seconds
const parseDurationToSeconds = (durationString) => {
  if (!durationString) return 0;
  const parts = durationString.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) { // Handle HH:MM format if needed
    return parts[0] * 3600 + parts[1] * 60;
  }
  return 0;
};

// --- Machine Details Page ---
const MachineDetailsPage = () => {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const [machineData, setMachineData] = useState(null);
  const [machine, setMachine] = useState(null); // Static info
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState([]);

  // Fetch static machine info just once to get the name/type/schedule
  // Real implementation might strictly use the live data if it contains everything.
  // Using live data endpoint for everything as per previous pattern.

  const fetchMachineDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_live_data_by_machine_ID/${machineId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch machine details');
      }
      const resData = await response.json();

      // Handle wrapped response { success: true, data: [...] }
      // Assuming get_live_data_by_machine_ID returns a single item in data array or the item itself
      let actualData = resData;
      if (resData.data) {
        actualData = Array.isArray(resData.data) ? resData.data[0] : resData.data;
      }

      if (!actualData) {
        throw new Error('No data found for this machine');
      }

      setMachineData(actualData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching details:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchGraphData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_machine_readings/${machineId}`);
      if (response.ok) {
        const resData = await response.json();

        // Backend returns { success: true, data: [...] }
        if (resData.data && Array.isArray(resData.data)) {
          // Ensure data is sorted
          const sorted = resData.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          setGraphData(sorted);
        } else if (Array.isArray(resData)) {
          // Fallback if it returns array directly (unlikely based on check)
          const sorted = resData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          setGraphData(sorted);
        }
      }
    } catch (err) {
      console.error("Graph fetch error", err);
    }
  }

  useEffect(() => {
    fetchMachineDetails();
    fetchGraphData();
    const interval = setInterval(() => {
      fetchMachineDetails();
      fetchGraphData();
    }, 10000);

    return () => clearInterval(interval);
  }, [machineId]);


  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="container mt-5">
      <div className="alert alert-danger">Error: {error}</div>
      <button className="btn btn-outline-primary" onClick={() => navigate('/')}>Back to Dashboard</button>
    </div>
  );

  if (!machineData) return <div>Machine not found</div>;

  // Re-use logic for status color/badge
  const getStatusBadge = (status) => {
    return status === 'On'
      ? <span className="badge bg-success fs-5 px-4 py-2">ACTIVE</span>
      : <span className="badge bg-danger fs-5 px-4 py-2">INACTIVE</span>;
  };

  const getEfficiencyColor = (eff) => {
    const val = parseFloat(eff);
    if (val >= 80) return 'text-success';
    if (val >= 50) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="container-fluid bg-light min-vh-100 p-4">
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-body p-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <button className="btn btn-link text-decoration-none fw-bold me-3" onClick={() => navigate('/')}>
              <ArrowLeft size={20} className="me-1" /> Back to Dashboard
            </button>
          </div>

          <div className="text-end">
            <h5 className="mb-0 text-primary fw-bold">Machine Details - ID: {machineData.machine_id}</h5>
            <small className="text-muted">{new Date().toLocaleDateString()}</small>
          </div>
        </div>
      </div>

      <div className="container-fluid px-0">
        {/* Top Row - Machine Details */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <div className="row">
                  <div className="col-md-3 mb-4 mb-md-0">
                    <h6 className="text-uppercase text-muted fw-bold small">Machine ID</h6>
                    <h2 className="fw-bold">{machineData.machine_id}</h2>
                  </div>
                  <div className="col-md-3 mb-4 mb-md-0">
                    <h6 className="text-uppercase text-muted fw-bold small">Machine Name</h6>
                    <h4 className="fw-bold">{machineData.machine_name}</h4>
                  </div>
                  <div className="col-md-2 mb-4 mb-md-0">
                    <h6 className="text-uppercase text-muted fw-bold small mb-2">Status</h6>
                    {getStatusBadge(machineData.current_status)}
                  </div>
                  <div className="col-md-2 mb-4 mb-md-0">
                    <div className="p-3 bg-light rounded-3 text-center">
                      <h6 className="text-muted small">Efficiency</h6>
                      <h1 className={`fw-bold mb-0 ${getEfficiencyColor(machineData.efficiency_percentage)}`}>
                        {machineData.efficiency_percentage}%
                      </h1>
                    </div>
                  </div>
                  <div className="col-md-2 mb-4 mb-md-0">
                    <div className="p-3 bg-light rounded-3 text-center h-100 d-flex flex-column justify-content-center">
                      <h6 className="text-muted small">Machine Type</h6>
                      <h5 className="fw-bold mb-0 text-dark">{machineData.machine_type || 'N/A'}</h5>
                    </div>
                  </div>
                </div>

                <hr className="my-4 text-muted" />

                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <span className="text-muted small d-block">Scheduled Start</span>
                      <span className="fw-bold">{machineData.scheduled_start_time || '09:00'}</span>
                    </div>
                    <div>
                      <span className="text-muted small d-block">Scheduled Stop</span>
                      <span className="fw-bold">{machineData.scheduled_stop_time || '21:00'}</span>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3">
                      <span className="text-muted small d-block">Actual Start</span>
                      <span className="fw-bold">{machineData.actual_start_time || '--:--'}</span>
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="mb-3 text-success">
                      <span className="small d-block">Total On Time</span>
                      <span className="fw-bold">{formatSeconds((machineData.total_on_time_minutes || 0) * 60)}</span>
                    </div>
                    <div className="text-danger">
                      <span className="small d-block">Total Off Time</span>
                      <span className="fw-bold">{formatSeconds((machineData.total_off_time_minutes || 0) * 60)}</span>
                    </div>
                  </div>

                  <div className="col-md-3">
                    {machineData.late_start_minutes > 0 && (
                      <div className="text-warning mb-3">
                        <span className="fw-bold small d-block">Late Start</span>
                        <span className="fw-bold">{formatSeconds(machineData.late_start_minutes * 60)}</span>
                      </div>
                    )}
                    {machineData.early_stop_minutes > 0 && (
                      <div className="text-danger">
                        <span className="fw-bold small d-block">Early Stop</span>
                        <span className="fw-bold">{formatSeconds(machineData.early_stop_minutes * 60)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left Side - Efficiency Graph */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">Efficiency Graph</h5>
                <EfficiencyGraph
                  data={graphData}
                  scheduledStart={machineData.scheduled_start_time}
                  scheduledStop={machineData.scheduled_stop_time}
                />
              </div>
            </div>
          </div>

          {/* Right Side - Operational Graph */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">Operational Graph (Status vs Time)</h5>
                <OperationalGraph
                  data={graphData}
                  scheduledStart={machineData.scheduled_start_time}
                  scheduledStop={machineData.scheduled_stop_time}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Operational Graph Component ---
const OperationalGraph = ({ data, scheduledStart = '00:00', scheduledStop = '24:00' }) => {
  const canvasRef = React.useRef(null);
  const [hoverData, setHoverData] = React.useState(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Define margins
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Parse Time
    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h + m / 60;
    };
    const startHour = parseTime(scheduledStart);
    let stopHour = parseTime(scheduledStop);
    if (stopHour <= startHour) stopHour += 24;
    const totalDurationHours = stopHour - startHour;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // Vertical grid lines (every hour)
    for (let i = 0; i <= totalDurationHours; i++) {
      const x = margin.left + (i / totalDurationHours) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + graphHeight);
      ctx.stroke();
    }

    // Horizontal grid lines
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left + graphWidth, margin.top);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + graphHeight / 2);
    ctx.lineTo(margin.left + graphWidth, margin.top + graphHeight / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + graphHeight);
    ctx.lineTo(margin.left + graphWidth, margin.top + graphHeight);
    ctx.stroke();

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + graphHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + graphHeight);
    ctx.lineTo(margin.left + graphWidth, margin.top + graphHeight);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.fillText('On', margin.left - 10, margin.top + 5);
    ctx.fillText('Off', margin.left - 10, margin.top + graphHeight - 5);

    // Y-axis title
    ctx.save();
    ctx.translate(20, margin.top + graphHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Status', 0, 0);
    ctx.restore();

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.font = '12px Arial';

    for (let i = 0; i <= totalDurationHours; i += 2) {
      const x = margin.left + (i / totalDurationHours) * graphWidth;
      let labelHour = (Math.floor(startHour) + i) % 24;
      ctx.fillText(`${String(labelHour).padStart(2, '0')}:00`, x, margin.top + graphHeight + 25);
    }

    // X-axis title
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Time (Scheduled: ${scheduledStart} - ${scheduledStop})`, margin.left + graphWidth / 2, height - 10);

    // Plot data if available
    if (data.length > 0) {
      const onY = margin.top + graphHeight * 0.05;
      const offY = margin.top + graphHeight * 0.95;

      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 2;
      ctx.beginPath();

      let currentY = offY;
      let currentX = margin.left;
      ctx.moveTo(currentX, currentY);

      const sorted = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      for (let p of sorted) {
        const t = new Date(p.timestamp);
        let h = t.getHours() + t.getMinutes() / 60;

        // Handle wrapping
        if (h < startHour && (startHour + totalDurationHours) > 24) h += 24;

        if (h < startHour || h > startHour + totalDurationHours) continue;

        const x = margin.left + ((h - startHour) / totalDurationHours) * graphWidth;

        ctx.lineTo(x, currentY); // Maintain level
        const newY = p.status === 'on' ? onY : offY;
        ctx.lineTo(x, newY); // Vertical step
        currentY = newY;
      }

      ctx.lineTo(margin.left + graphWidth, currentY);
      ctx.stroke();

      // Fill On Regions
      ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
      let fillStart = null;
      let isFilling = false;

      let fCurrentY = offY;

      for (let p of sorted) {
        const t = new Date(p.timestamp);
        let h = t.getHours() + t.getMinutes() / 60;

        if (h < startHour && (startHour + totalDurationHours) > 24) h += 24;

        if (h < startHour) continue;

        let relativeH = h - startHour;
        if (relativeH > totalDurationHours) relativeH = totalDurationHours;

        const x = margin.left + (relativeH / totalDurationHours) * graphWidth;

        if (p.status === 'on') {
          if (!isFilling) {
            fillStart = Math.max(margin.left, x);
            isFilling = true;
          }
        } else {
          if (isFilling) {
            const fillEnd = Math.min(margin.left + graphWidth, x);
            if (fillEnd > fillStart) {
              ctx.fillRect(fillStart, onY - 2, fillEnd - fillStart, (offY - onY) + 4);
            }
            isFilling = false;
          }
        }
      }

      if (isFilling) {
        ctx.fillRect(fillStart, onY - 2, (margin.left + graphWidth) - fillStart, (offY - onY) + 4);
      }

    } else {
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', margin.left + graphWidth / 2, margin.top + graphHeight / 2);
    }
  }, [data, scheduledStart, scheduledStop]);

  const handleMouseMove = (e) => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;

    // Scale Y if needed, though we only use X for time
    // const scaleY = canvas.height / rect.height;
    // const y = (e.clientY - rect.top) * scaleY;

    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const width = canvas.width;
    const graphWidth = width - margin.left - margin.right;

    if (x < margin.left || x > margin.left + graphWidth) {
      setHoverData(null);
      return;
    }

    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h + m / 60;
    };
    const startHour = parseTime(scheduledStart);
    let stopHour = parseTime(scheduledStop);
    if (stopHour <= startHour) stopHour += 24;
    const totalDurationHours = stopHour - startHour;

    const offsetHours = ((x - margin.left) / graphWidth) * totalDurationHours;
    const absoluteHour = startHour + offsetHours;

    const h = Math.floor(absoluteHour) % 24;
    const m = Math.floor((absoluteHour % 1) * 60);
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    setHoverData({ x: e.clientX, y: e.clientY, time: timeStr });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="position-relative" style={{ width: '100%', height: '350px' }}>
      <canvas
        ref={canvasRef}
        width={1000}
        height={350}
        style={{ width: '100%', height: '100%' }}
        className="img-fluid"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoverData && (
        <div style={{
          position: 'fixed',
          left: hoverData.x + 10,
          top: hoverData.y - 40,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          Time: {hoverData.time}
        </div>
      )}
    </div>
  );
};

// --- Efficiency Graph Component ---
const EfficiencyGraph = ({ data, scheduledStart = '00:00', scheduledStop = '24:00' }) => {
  const canvasRef = React.useRef(null);
  const [hoverData, setHoverData] = React.useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Allow rendering grid even without data

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Define margins and dimensions
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Parse Scheduled Times
    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h + m / 60;
    };

    const startHour = parseTime(scheduledStart);
    let stopHour = parseTime(scheduledStop);
    if (stopHour <= startHour) stopHour += 24;

    const totalDurationHours = stopHour - startHour;

    // Draw Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Y-Axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + graphHeight);
    ctx.stroke();

    // X-Axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + graphHeight);
    ctx.lineTo(margin.left + graphWidth, margin.top + graphHeight);
    ctx.stroke();

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // Horizontal grid lines (0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 100; i += 25) {
      const y = margin.top + graphHeight - (i / 100) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + graphWidth, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${i}%`, margin.left - 10, y + 4);
    }

    // X-axis labels (hours)
    ctx.textAlign = 'center';

    for (let i = 0; i <= totalDurationHours; i += 2) {
      const x = margin.left + (i / totalDurationHours) * graphWidth;
      let labelHour = (Math.floor(startHour) + i) % 24;
      ctx.fillText(`${String(labelHour).padStart(2, '0')}:00`, x, margin.top + graphHeight + 25);

      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + graphHeight);
      ctx.stroke();
    }

    // Titles
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.save();
    ctx.translate(20, margin.top + graphHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Efficiency (%)', 0, 0);
    ctx.restore();

    ctx.fillText(`Time (Scheduled: ${scheduledStart} - ${scheduledStop})`, margin.left + graphWidth / 2, height - 10);

    // Reconstruct Efficiency Status Array within Scheduled Window
    if (!data || data.length === 0) return;

    // We need minute-by-minute efficiency calculation relative to the START of the schedule
    // Simulating minute steps from startHour to stopHour
    const startMinutes = Math.floor(startHour * 60);
    const totalMinutes = Math.floor(totalDurationHours * 60);

    // Create an array mapping minutes from start of day (0-1440+) to status
    // To handle cross-day, we might need a 48h buffer or just map relative minutes
    // Let's use a simpler approach: get machine status at each minute of the window

    // Sort data
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let cumulativeOn = 0;

    ctx.beginPath();
    ctx.strokeStyle = '#2196f3'; // Blue for efficiency
    ctx.lineWidth = 2;

    let firstPoint = true;

    // Optimization: Calculate status once for necessary range
    // But since data is sparse events, we can iterate minutes in window

    // Helper to get status at a specific absolute minute of the day
    // This is expensive if looped 720 times with array search.
    // Better: expand data into a minute-map first.

    const statusMap = new Uint8Array(24 * 60 * 2); // 48 hours support for safe wrap
    let ptr = 0;
    let currentStatus = 'off';

    // Fill map up to 48 hours
    for (let m = 0; m < 24 * 60 * 2; m++) {
      // Check if data point updates status
      while (ptr < sortedData.length) {
        const pTime = new Date(sortedData[ptr].timestamp);
        const pMinutes = pTime.getHours() * 60 + pTime.getMinutes();
        // If data point is 'future' relative to m, break
        if (m < pMinutes) {
          break;
        }
        // If m has reached or passed pMinutes, update status
        if (m >= pMinutes) {
          currentStatus = sortedData[ptr].status;
          ptr++;
        }
      }
      statusMap[m] = currentStatus === 'on' ? 1 : 0;
    }


    for (let i = 0; i <= totalMinutes; i++) {
      // i is minute offset from scheduled start
      const currentAbsMinute = startMinutes + i;

      // Get status at this minute
      // Note: logic above handles status map population linearly.
      // We need to re-populate statusMap correctly or just use the pre-calculated logic.
      // The pre-calc above is a bit flawed because 'm' iterates 0..end.
      // Let's use a robust approach for the loop:

      if (statusMap[currentAbsMinute % (24 * 60)] === 1) { // generic modulo for day wrapping if needed
        cumulativeOn++;
      }

      if (i === 0) continue; // Start plotting from minute 1

      const eff = (cumulativeOn / (i + 1)) * 100;

      // Plot resolution
      if (i % 5 === 0 || i === totalMinutes) {
        const x = margin.left + (i / totalMinutes) * graphWidth;
        const y = margin.top + graphHeight - (eff / 100) * graphHeight;

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }

    ctx.stroke();

  }, [data, scheduledStart, scheduledStop]);

  const handleMouseMove = (e) => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;

    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const width = canvas.width;
    const graphWidth = width - margin.left - margin.right;

    if (x < margin.left || x > margin.left + graphWidth) {
      setHoverData(null);
      return;
    }

    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h + m / 60;
    };
    const startHour = parseTime(scheduledStart);
    let stopHour = parseTime(scheduledStop);
    if (stopHour <= startHour) stopHour += 24;
    const totalDurationHours = stopHour - startHour;

    const offsetHours = ((x - margin.left) / graphWidth) * totalDurationHours;
    const absoluteHour = startHour + offsetHours;

    const h = Math.floor(absoluteHour) % 24;
    const m = Math.floor((absoluteHour % 1) * 60);
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    setHoverData({ x: e.clientX, y: e.clientY, time: timeStr });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div className="position-relative" style={{ width: '100%', height: '350px' }}>
      <canvas
        ref={canvasRef}
        width={1000}
        height={350}
        style={{ width: '100%', height: '100%' }}
        className="img-fluid"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hoverData && (
        <div style={{
          position: 'fixed',
          left: hoverData.x + 10,
          top: hoverData.y - 40,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          Time: {hoverData.time}
        </div>
      )}
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [currentPage, setCurrentPage] = useState('monitoring');
  const [activeConfigView, setActiveConfigView] = useState('list');
  const [editingMachine, setEditingMachine] = useState(null);

  return (
    <Routes>
      <Route path="/machine/:machineId" element={<MachineDetailsPage />} />
      <Route path="/" element={
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
                      onClick={() => { setActiveConfigView('list'); setEditingMachine(null); }}
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
                      {activeConfigView === 'list' && (
                        <MachineList onEdit={(machine) => {
                          setEditingMachine(machine);
                          setActiveConfigView('add');
                        }} />
                      )}
                      {activeConfigView === 'add' && (
                        <AddMachineForm
                          initialData={editingMachine}
                          onSuccess={() => { setActiveConfigView('list'); setEditingMachine(null); }}
                          onCancel={() => { setActiveConfigView('list'); setEditingMachine(null); }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      } />
    </Routes>
  );
};

export default App;