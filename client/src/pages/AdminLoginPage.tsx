import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminLogin } from '../api';
import { setAdminToken } from '../auth/adminAuth';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await adminLogin(username, password);
      setAdminToken(token);
      navigate('/admin');
    } catch {
      setError('Hibás felhasználónév vagy jelszó.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">// admin belépés</h2>
      <p className="card-subtitle">
        Csak oktatói hozzáférés. A diákok a főoldalon csatlakoznak.
      </p>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="username">Felhasználónév</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Jelszó</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn" disabled={loading || !username || !password}>
          {loading ? 'Belépés...' : 'Belépés →'}
        </button>

        {error && <p className="error">{error}</p>}
      </form>

      <Link to="/" className="admin-link">[ vissza a csatlakozáshoz ]</Link>
    </div>
  );
}
