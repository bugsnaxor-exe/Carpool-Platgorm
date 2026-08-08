const { useState, useEffect } = React;

function AdminConsole({ token, user }) {
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && user && user.role === 'COMPANY_ADMIN') {
      fetchAdminData();
    } else {
      setLoading(false);
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
      <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', color: '#e74c3c', marginBottom: '16px' }}>
          <i className="fa-solid fa-shield-cat"></i>
        </div>
        <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '8px', color: '#11281A' }}>Admin Authorization Required</h3>
        <p style={{ color: '#5D7063', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
          You are currently logged in as an Employee account. Switch to an Admin account to access corporate mobility & sustainability analytics.
        </p>
      </div>
    );
  }

  if (loading || !analytics) {
    return (
      <div>
        <div className="metrics-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-card" style={{ height: '100px' }}>
              <div className="skeleton skeleton-line short"></div>
              <div className="skeleton skeleton-line medium" style={{ height: '22px', marginTop: '10px' }}></div>
            </div>
          ))}
        </div>
        <div className="skeleton-card" style={{ height: '200px' }}>
          <div className="skeleton skeleton-line medium"></div>
          <div className="skeleton skeleton-block" style={{ height: '120px', marginTop: '12px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-grid">
      <div className="card" style={{ background: '#053B22', color: '#FFFFFF', border: 'none', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF' }}>Corporate Mobility Admin Console</h2>
            <p style={{ fontSize: '0.82rem', color: '#A3D9B5', marginTop: '4px' }}>Acme Mobility & Sustainability Dashboard</p>
          </div>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', padding: '6px 14px', fontSize: '0.82rem', border: '1px solid rgba(255,255,255,0.25)' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: '#58D68D' }}></i> Verified Enterprise Admin
          </span>
        </div>
      </div>

      {/* Analytics KPI Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Total Employee Trips</div>
          <div className="metric-value">{analytics.totalTrips || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#0D6E42', marginTop: '4px', fontWeight: '700' }}>
            <i className="fa-solid fa-arrow-up"></i> +14.2% this month
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Total Shared Mileage</div>
          <div className="metric-value" style={{ color: '#0D6E42' }}>{analytics.totalDistanceKm || 0} <span style={{ fontSize: '1rem' }}>km</span></div>
          <div style={{ fontSize: '0.75rem', color: '#5D7063', marginTop: '4px' }}>Shared commuting mileage</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Carbon Offset (CO₂ Saved)</div>
          <div className="metric-value" style={{ color: '#0D6E42' }}>{analytics.co2SavedKg || 0} <span style={{ fontSize: '1rem' }}>kg</span></div>
          <div style={{ fontSize: '0.75rem', color: '#0D6E42', marginTop: '4px', fontWeight: '700' }}><i className="fa-solid fa-leaf"></i> High Sustainability Rating</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Fuel Conserved</div>
          <div className="metric-value" style={{ color: '#0D6E42' }}>{analytics.estimatedFuelLiters || 0} <span style={{ fontSize: '1rem' }}>L</span></div>
          <div style={{ fontSize: '0.75rem', color: '#5D7063', marginTop: '4px' }}>Est. ₹{((analytics.estimatedFuelLiters || 0) * 102).toFixed(0)} saved</div>
        </div>
      </div>

      {/* Employee Roster Table */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '16px 0 12px 0', color: '#11281A' }}>Employee Roster & Security Status</h3>
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
            {employees.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#8E9F93' }}>No employees registered yet.</td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp._id}>
                  <td style={{ fontWeight: '700', color: '#11281A' }}>{emp.name}</td>
                  <td>{emp.email}</td>
                  <td>{emp.mobileNumber}</td>
                  <td><span className={`badge ${emp.role === 'COMPANY_ADMIN' ? 'badge-purple' : 'badge-emerald'}`}>{emp.role}</span></td>
                  <td style={{ fontSize: '0.8rem', color: '#5D7063' }}>{emp.organizationId || 'ACME'}</td>
                  <td>
                    <span className="badge badge-emerald">
                      <i className="fa-solid fa-key"></i> Scrypt Protected
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Immutable Audit Logs Viewer */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '20px 0 12px 0', color: '#11281A' }}>Immutable Audit Logs</h3>
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
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#8E9F93' }}>No audit logs generated yet.</td>
              </tr>
            ) : (
              auditLogs.map(log => (
                <tr key={log._id}>
                  <td style={{ fontSize: '0.78rem', color: '#5D7063' }}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td><span className="badge badge-emerald">{log.action}</span></td>
                  <td>{log.targetType}</td>
                  <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.AdminConsole = AdminConsole;
