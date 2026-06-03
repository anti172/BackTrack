import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { join, fetchSession } from '../api';
import { getParticipantId, setParticipant } from '../auth/participantStorage';

export default function JoinPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSession().then((session) => {
      const savedId = getParticipantId();
      if (savedId && session.participants.some((p) => p.id === savedId)) {
        if (session.phase === 'level2complete') navigate('/level2/done');
        else if (session.phase === 'level2hacking') navigate('/level2');
        else if (session.phase === 'grouped') navigate('/groups');
        else if (session.phase === 'hacking') navigate('/hack');
      }
    }).catch(() => {});
  }, [navigate]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { participantId } = await join(name);
      setParticipant(participantId, name);
      navigate('/hack');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">// csatlakozás a rendszerhez</h2>
      <p className="card-subtitle">
        Add meg a neved. Az admin elindítja a hackelést —
        neked ki kell találnod a 5 számjegyű kódot visszalépéses kereséssel.
      </p>

      <form onSubmit={handleJoin}>
        <div className="form-group">
          <label htmlFor="name">Név</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="pl. Nagy Anna"
            autoFocus
            required
            maxLength={50}
          />
        </div>

        <button type="submit" className="btn" disabled={loading || !name.trim()}>
          {loading ? 'Csatlakozás...' : 'Csatlakozás →'}
        </button>

        {error && <p className="error">{error}</p>}
      </form>

      <Link to="/admin/login" className="admin-link">[ admin belépés ]</Link>
    </div>
  );
}
