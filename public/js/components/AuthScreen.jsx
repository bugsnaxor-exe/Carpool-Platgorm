const { useState } = React;

function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
  const [identifier, setIdentifier] = useState('alex.rivera@acme.com'); // Pre-filled demo
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);

  // Register Fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regCompanyCode, setRegCompanyCode] = useState('ACME');
  const [regRole, setRegRole] = useState('EMPLOYEE');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          mobileNumber: regMobile,
          password,
          companyCode: regCompanyCode || 'ACME',
          role: regRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', color: '#fff', marginBottom: '12px' }}>
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Enterprise Login</h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sign in using your Email or Mobile Number</p>
      </div>

      <div className="auth-tabs">
        <button className={`auth-tab ${mode === 'LOGIN' ? 'active' : ''}`} onClick={() => setMode('LOGIN')}>Login</button>
        <button className={`auth-tab ${mode === 'REGISTER' ? 'active' : ''}`} onClick={() => setMode('REGISTER')}>Sign Up</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      )}

      {mode === 'LOGIN' ? (
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email or Mobile Number</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. alex@acme.com or +919811223344"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Password</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '34px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'} <i className="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input type="text" className="input-field" placeholder="John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-label">Corporate Email</label>
            <input type="email" className="input-field" placeholder="john@acme.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Mobile Number</label>
            <input type="text" className="input-field" placeholder="+919876543210" value={regMobile} onChange={(e) => setRegMobile(e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Company Code (Default: ACME)</label>
            <input type="text" className="input-field" placeholder="ACME or TECH" value={regCompanyCode} onChange={(e) => setRegCompanyCode(e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-label">Account Role</label>
            <select className="input-field" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
              <option value="EMPLOYEE">Employee (Rider / Driver)</option>
              <option value="COMPANY_ADMIN">Company Administrator</option>
            </select>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      )}

      {/* Demo Credentials Quick Selector */}
      <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
        <strong style={{ color: '#fff' }}>Quick Demo Accounts:</strong>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <button type="button" onClick={() => { setIdentifier('alex.rivera@acme.com'); setPassword('Password123!'); }} style={{ flex: 1, padding: '4px', background: '#1e293b', border: 'none', color: '#10b981', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Driver</button>
          <button type="button" onClick={() => { setIdentifier('+919988776655'); setPassword('Password123!'); }} style={{ flex: 1, padding: '4px', background: '#1e293b', border: 'none', color: '#3b82f6', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Passenger (Phone)</button>
          <button type="button" onClick={() => { setIdentifier('admin@acme.com'); setPassword('Password123!'); }} style={{ flex: 1, padding: '4px', background: '#1e293b', border: 'none', color: '#8b5cf6', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Admin</button>
        </div>
      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
