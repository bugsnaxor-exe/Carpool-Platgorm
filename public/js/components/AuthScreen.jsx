const { useState } = React;

function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
  const [identifier, setIdentifier] = useState('alex.rivera@acme.com'); // Pre-filled demo
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);

  // Register Fields
  const [regStep, setRegStep] = useState(1); // 1: Info Form, 2: OTP Verification Section
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regCompanyCode, setRegCompanyCode] = useState('ACME');
  const [regRole, setRegRole] = useState('EMPLOYEE');

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [otpMsg, setOtpMsg] = useState('');

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

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!regName.trim()) {
      setError('Please enter your Full Name');
      return;
    }
    if (!regEmail || !regEmail.includes('@')) {
      setError('Please enter a valid Corporate Email address to receive the verification OTP');
      return;
    }
    if (!password) {
      setError('Please choose a password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send verification OTP');

      setDebugOtp(data.debugOtp || '');
      setOtpMsg(data.message || 'OTP sent successfully');
      setRegStep(2); // Advance to OTP verification section
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Register User
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!otpCode || otpCode.trim().length < 4) {
      setError('Please enter the 6-digit OTP verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          otp: otpCode.trim(),
          name: regName,
          mobileNumber: regMobile,
          password,
          companyCode: regCompanyCode || 'ACME',
          role: regRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

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
        <div style={{ 
          width: '60px', 
          height: '60px', 
          borderRadius: '18px', 
          background: '#053B22', 
          display: 'inline-flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          fontSize: '1.8rem', 
          color: '#58D68D', 
          marginBottom: '14px',
          boxShadow: '0 8px 25px rgba(5, 59, 34, 0.22)'
        }}>
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#11281A', letterSpacing: '-0.3px' }}>Enterprise Portal</h3>
        <p style={{ fontSize: '0.85rem', color: '#5D7063', marginTop: '4px' }}>Access your corporate mobility platform</p>
      </div>

      {/* Pill Tab Switcher */}
      <div className="auth-tabs">
        <button type="button" className={`auth-tab ${mode === 'LOGIN' ? 'active' : ''}`} onClick={() => { setMode('LOGIN'); setRegStep(1); setError(''); }}>
          Sign In
        </button>
        <button type="button" className={`auth-tab ${mode === 'REGISTER' ? 'active' : ''}`} onClick={() => { setMode('REGISTER'); setRegStep(1); setError(''); }}>
          Register
        </button>
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(231, 76, 60, 0.1)', 
          border: '1px solid rgba(231, 76, 60, 0.3)', 
          color: '#c0392b', 
          padding: '12px 14px', 
          borderRadius: '12px', 
          fontSize: '0.82rem', 
          marginBottom: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '1rem' }}></i> {error}
        </div>
      )}

      {mode === 'LOGIN' ? (
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-envelope" style={{ color: '#0D6E42' }}></i> Email or Mobile Number</label>
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
            <label className="input-label"><i className="fa-solid fa-lock" style={{ color: '#0D6E42' }}></i> Password</label>
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
              style={{ position: 'absolute', right: '14px', top: '34px', background: 'none', border: 'none', color: '#0D6E42', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Authenticating...' : 'Sign In'} <i className="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      ) : (
        /* REGISTER MODE */
        regStep === 1 ? (
          /* Step 1: User Details Form */
          <form onSubmit={handleSendOtp}>
            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-user" style={{ color: '#0D6E42' }}></i> Full Name</label>
              <input type="text" className="input-field" placeholder="John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-envelope" style={{ color: '#0D6E42' }}></i> Corporate Email (OTP will be sent here)</label>
              <input type="email" className="input-field" placeholder="john@acme.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-phone" style={{ color: '#0D6E42' }}></i> Mobile Number</label>
              <input type="text" className="input-field" placeholder="+919876543210" value={regMobile} onChange={(e) => setRegMobile(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-building" style={{ color: '#0D6E42' }}></i> Company Code</label>
              <input type="text" className="input-field" placeholder="ACME" value={regCompanyCode} onChange={(e) => setRegCompanyCode(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-lock" style={{ color: '#0D6E42' }}></i> Create Password</label>
              <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-user-gear" style={{ color: '#0D6E42' }}></i> Account Role</label>
              <select className="input-field" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                <option value="EMPLOYEE">Employee (Rider / Driver)</option>
                <option value="COMPANY_ADMIN">Company Administrator</option>
              </select>
            </div>

            <button type="submit" className="btn" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'Sending OTP...' : 'Send Email OTP & Continue'} <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification Section */
          <form onSubmit={handleVerifyOtpAndRegister}>
            <div className="card" style={{ background: '#F3ECE1', border: '1px solid #0D6E42', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0D6E42', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: '10px' }}>
                <i className="fa-solid fa-envelope-circle-check"></i>
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#11281A', marginBottom: '4px' }}>Verify Your Email</h4>
              <p style={{ fontSize: '0.82rem', color: '#5D7063' }}>
                Enter the 6-digit verification code sent to <strong style={{ color: '#0D6E42' }}>{regEmail}</strong>
              </p>

              {debugOtp && (
                <div style={{ marginTop: '10px', padding: '6px 12px', background: 'rgba(13, 110, 66, 0.15)', border: '1px dashed #0D6E42', borderRadius: '8px', color: '#0D6E42', fontSize: '0.8rem', fontWeight: '800' }}>
                  <i className="fa-solid fa-key"></i> DEMO OTP CODE: <span style={{ letterSpacing: '3px', fontSize: '1rem' }}>{debugOtp}</span>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label" style={{ textAlign: 'center', display: 'block' }}>6-Digit OTP Verification Code</label>
              <input 
                type="text" 
                maxLength={6}
                className="input-field" 
                placeholder="4 8 2 9 1 5"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '8px', fontWeight: '800', color: '#0D6E42', padding: '14px' }}
                autoFocus
                required
              />
            </div>

            <button type="submit" className="btn" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? 'Verifying Code...' : 'Submit OTP & Create Account'} <i className="fa-solid fa-circle-check"></i>
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
              <button 
                type="button" 
                onClick={() => setRegStep(1)} 
                style={{ background: 'none', border: 'none', color: '#5D7063', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
              >
                <i className="fa-solid fa-arrow-left"></i> Edit Details
              </button>

              <button 
                type="button" 
                onClick={handleSendOtp} 
                style={{ background: 'none', border: 'none', color: '#0D6E42', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800' }}
              >
                <i className="fa-solid fa-rotate-right"></i> Resend OTP
              </button>
            </div>
          </form>
        )
      )}

      {/* Demo Credentials Quick Selector */}
      <div style={{ marginTop: '22px', padding: '14px', background: '#F3ECE1', borderRadius: '14px', border: '1px solid #E8E1D3' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#11281A', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <i className="fa-solid fa-bolt" style={{ color: '#0D6E42' }}></i> Quick Demo Credentials:
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => { setIdentifier('alex.rivera@acme.com'); setPassword('Password123!'); setMode('LOGIN'); setRegStep(1); }} style={{ flex: 1, padding: '8px 4px', background: '#FFFFFF', border: '1px solid #E8E1D3', color: '#0D6E42', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}>
            <i className="fa-solid fa-car"></i> Driver
          </button>
          <button type="button" onClick={() => { setIdentifier('+919988776655'); setPassword('Password123!'); setMode('LOGIN'); setRegStep(1); }} style={{ flex: 1, padding: '8px 4px', background: '#FFFFFF', border: '1px solid #E8E1D3', color: '#0D6E42', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}>
            <i className="fa-solid fa-mobile-screen"></i> Rider
          </button>
          <button type="button" onClick={() => { setIdentifier('admin@acme.com'); setPassword('Password123!'); setMode('LOGIN'); setRegStep(1); }} style={{ flex: 1, padding: '8px 4px', background: '#FFFFFF', border: '1px solid #E8E1D3', color: '#053B22', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.78rem' }}>
            <i className="fa-solid fa-user-shield"></i> Admin
          </button>
        </div>
      </div>
    </div>
  );
}

window.AuthScreen = AuthScreen;
