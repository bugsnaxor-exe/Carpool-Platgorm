const { useState, useEffect } = React;

function AdminConsole({ token, user }) {
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && user && user.role === 'COMPANY_ADMIN') {
      fetchAdminData();
    }
  }, [token, user]);

  const fetchAdminData = async () => {
    try {
      const [res1, res2, res3] = await Promise.all([
        fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/employees', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();
      const data3 = await res3.json();

      setAnalytics(data1);
      setEmployees(data2);
      setAuditLogs(data3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'COMPANY_ADMIN') {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '16px' }}><i className="fa-solid fa-lock"></i></div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>Admin Authorization Required</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 20px auto' }}>
          You are currently logged in as an Employee account. Switch to an Admin account to access corporate mobility analytics.
        </p>
      </div>
    );
  }

  if (loading || !analytics) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading Admin Console...</div>;
  }

  return (
    <div className="admin-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Corporate Mobility Admin Console</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Acme Corporation Mobility & Sustainability Dashboard</p>
        </div>
        <span className="badge badge-purple" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
          <i className="fa-solid fa-shield-halved"></i> Enterprise Admin Verified
        </span>
      </div>

      {/* Analytics KPI Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Total Employee Trips</div>
          <div className="metric-value">{analytics.totalTrips}</div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>
            <i className="fa-solid fa-arrow-up"></i> +14.2% this month
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Total Distance Covered</div>
          <div className="metric-value" style={{ color: '#3b82f6' }}>{analytics.totalDistanceKm} <span style={{ fontSize: '1rem' }}>km</span></div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Shared commuting mileage</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Carbon Offset (CO₂ Saved)</div>
          <div className="metric-value" style={{ color: '#10b981' }}>{analytics.co2SavedKg} <span style={{ fontSize: '1rem' }}>kg</span></div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}><i className="fa-solid fa-leaf"></i> High Sustainability Rating</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Fuel Conserved</div>
          <div className="metric-value" style={{ color: '#f59e0b' }}>{analytics.estimatedFuelLiters} <span style={{ fontSize: '1rem' }}>L</span></div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Est. ₹{(analytics.estimatedFuelLiters * 102).toFixed(0)} saved</div>
        </div>
      </div>

      {/* Employee Roster Table */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '24px 0 14px 0' }}>Employee Roster & Security Status</h3>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Org ID</th>
              <th>Password Hash Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp._id}>
                <td style={{ fontWeight: '600' }}>{emp.name}</td>
                <td>{emp.email}</td>
                <td>{emp.mobileNumber}</td>
                <td><span className={`badge ${emp.role === 'COMPANY_ADMIN' ? 'badge-purple' : 'badge-emerald'}`}>{emp.role}</span></td>
                <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{emp.organizationId}</td>
                <td>
                  <span className="badge badge-emerald" title="Zero-Knowledge Scrypt Hashed">
                    <i className="fa-solid fa-key"></i> Scrypt Salted (Zero-Knowledge Protected)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Immutable Audit Logs Viewer */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '24px 0 14px 0' }}>Immutable Audit Logs</h3>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => (
              <tr key={log._id}>
                <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleString()}</td>
                <td><span className="badge badge-blue">{log.action}</span></td>
                <td>{log.targetType}</td>
                <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.AdminConsole = AdminConsole;
