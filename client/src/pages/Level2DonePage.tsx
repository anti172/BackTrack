import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSession } from '../api';
import { getParticipantId } from '../auth/participantStorage';
import { useSignalR } from '../hooks/useSignalR';

export default function Level2DonePage() {
  const navigate = useNavigate();
  const participantId = getParticipantId() ?? '';

  const { on } = useSignalR();

  useEffect(() => {
    if (!participantId) {
      navigate('/');
      return;
    }
    fetchSession().then((s) => {
      if (s.phase !== 'level2complete') {
        if (s.phase === 'level2hacking') navigate('/level2');
        else if (s.phase === 'grouped') navigate('/groups');
        else navigate('/');
      }
    });
  }, [participantId, navigate]);

  useEffect(() => {
    const unsub = on('SessionReset', () => navigate('/'));
    return () => unsub();
  }, [on, navigate]);

  return (
    <div className="card">
      <h2 className="card-title">// 2. szint teljesítve</h2>
      <div className="hacked-banner" style={{ marginTop: '1rem' }}>
        ✓ Gratulálunk — a csoportotok feltörte a szabályalapú kódot!
      </div>
      <p className="card-subtitle" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        Ez volt a backtracking gyakorlat: szabályok alapján szűkítettétek a keresési teret,
        majd pozíciónként zártátok le a helyes számjegyeket.
      </p>
    </div>
  );
}
