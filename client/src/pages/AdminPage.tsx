import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAdminToken } from '../auth/adminAuth';
import {
  fetchSession,
  startHacking,
  startLevel2,
  resetSession,
  computeGroupSizes,
  defaultCodeRules,
  type Participant,
  type SessionPhase,
  type CodeRules,
} from '../api';
import { useLiveSession } from '../hooks/useLiveSession';
import RuleConfigPanel from '../components/RuleConfigPanel';

export default function AdminPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<SessionPhase>('lobby');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groups, setGroups] = useState<Record<number, string[]>>({});
  const [groupCodes, setGroupCodes] = useState<Record<number, string>>({});
  const [groupCount, setGroupCount] = useState(5);
  const [level2Rules, setLevel2Rules] = useState<CodeRules>(defaultCodeRules());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');

  const loadSession = useCallback(async () => {
    const session = await fetchSession();
    setPhase(session.phase);
    setParticipants(session.participants);
    setGroups(session.groups);
    setGroupCodes(session.groupCodes);
    if (session.groupCount > 0) setGroupCount(session.groupCount);
    if (session.level2Rules) setLevel2Rules(session.level2Rules);
  }, []);

  const { on, connected, error: signalRError } = useLiveSession(loadSession, 2000);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    const unsubs = [
      on('ParticipantJoined', () => loadSession()),
      on('PhaseChanged', () => loadSession()),
      on('GuessSubmitted', () => loadSession()),
      on('GroupsAssigned', () => loadSession()),
      on('Level2Started', () => loadSession()),
      on('Level2GuessSubmitted', () => loadSession()),
      on('Level2Complete', () => loadSession()),
      on('SessionReset', () => loadSession()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on, loadSession]);

  const plannedSizes =
    participants.length >= groupCount && groupCount >= 1
      ? computeGroupSizes(participants.length, groupCount)
      : [];
  const canStart = participants.length >= groupCount && groupCount >= 1;
  const hackedCount = participants.filter((p) => p.isHacked).length;

  async function handleStart() {
    setError('');
    setLoading('start');
    try {
      await startHacking(groupCount);
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.');
    } finally {
      setLoading('');
    }
  }

  async function handleStartLevel2() {
    setError('');
    setLoading('level2');
    try {
      await startLevel2(level2Rules);
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.');
    } finally {
      setLoading('');
    }
  }

  function handleLogout() {
    clearAdminToken();
    navigate('/admin/login');
  }

  async function handleReset() {
    if (!confirm('Biztosan újraindítod a munkamenetet?')) return;
    setError('');
    setLoading('reset');
    try {
      await resetSession();
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.');
    } finally {
      setLoading('');
    }
  }

  const groupEntries = Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="card">
      <h2 className="card-title">// admin konzol</h2>
      <p className="card-subtitle">
        Add meg a csoportok számát — a résztvevőket egyenletesen osztjuk szét
        (pl. 17 fő, 5 csoport → 4+4+3+3+3). Csoportonként egy véletlen 5 számjegyű kód.
      </p>

      <div className="status-bar">
        <span>Fázis: <strong style={{ color: 'var(--green)' }}>{phase}</strong></span>
        <span>Résztvevők: {participants.length}</span>
        <span style={{ color: connected ? 'var(--green)' : 'var(--amber)' }}>
          {connected ? '● live' : '○ poll'}
        </span>
        {signalRError && <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>SR: poll aktív</span>}
        {phase !== 'lobby' && (
          <span>Feltörve: {hackedCount}/{participants.length}</span>
        )}
      </div>

      {phase === 'lobby' && (
        <div className="admin-config">
          <div className="form-group">
            <label htmlFor="groupCount">Csoportok száma</label>
            <input
              id="groupCount"
              type="number"
              min={1}
              max={50}
              value={groupCount}
              onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value)))}
            />
          </div>
          <div className={`capacity-info ${canStart ? 'ok' : 'warn'}`}>
            {participants.length} résztvevő → <strong>{groupCount}</strong> csoport
            {canStart ? (
              <> — létszám: <strong>{plannedSizes.join(' + ')}</strong> fő</>
            ) : (
              <> — legalább {groupCount} ember kell (csoportonként min. 1)</>
            )}
          </div>
        </div>
      )}

      {phase === 'lobby' && (
        <ul className="participant-list">
          {participants.length === 0 && (
            <li className="participant-item" style={{ color: 'var(--muted)' }}>
              Még nincs csatlakozó...
            </li>
          )}
          {participants.map((p) => (
            <li key={p.id} className="participant-item">
              <span>{p.name}</span>
            </li>
          ))}
        </ul>
      )}

      {phase !== 'lobby' && groupEntries.length > 0 && (
        <div className="admin-groups">
          {groupEntries.map(([num, memberIds]) => {
            const members = memberIds
              .map((id) => participants.find((p) => p.id === id))
              .filter(Boolean) as Participant[];

            return (
              <div key={num} className="group-card">
                <div className="group-title">
                  Csoport {Number(num) + 1} ({members.length} fő)
                  <span className="group-code">kód: {groupCodes[Number(num)] ?? '?????'}</span>
                </div>
                {members.map((m) => (
                  <div key={m.id} className="group-member">
                    {m.name}
                    {phase === 'hacking' || phase === 'level2hacking' ? (
                      <span className={`badge ${m.isHacked ? 'hacked' : ''}`} style={{ marginLeft: '0.5rem' }}>
                        {m.isHacked ? '✓' : `${m.lockedPositions.filter(Boolean).length}/5`}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="btn-group">
        {phase === 'lobby' && (
          <button
            className="btn"
            onClick={handleStart}
            disabled={!canStart || loading === 'start'}
          >
            {loading === 'start'
              ? 'Indítás...'
              : `Kódok generálása (${groupCount} csoport, ${participants.length} fő) →`}
          </button>
        )}

        {phase === 'hacking' && (
          <p className="capacity-info ok" style={{ textAlign: 'center' }}>
            1. szint folyamatban — ha mindenki feltörte a kódját, megjelennek a csoportok.
          </p>
        )}

        {phase === 'grouped' && (
          <>
            <RuleConfigPanel rules={level2Rules} onChange={setLevel2Rules} />
            <button
              className="btn"
              onClick={handleStartLevel2}
              disabled={loading === 'level2'}
            >
              {loading === 'level2' ? 'Indítás...' : '2. szint indítása (szabályokkal) →'}
            </button>
          </>
        )}

        {phase === 'level2hacking' && (
          <p className="capacity-info ok" style={{ textAlign: 'center' }}>
            2. szint folyamatban — szabályalapú kód feltörése ({hackedCount}/{participants.length})
          </p>
        )}

        {phase === 'level2complete' && (
          <p className="capacity-info ok" style={{ textAlign: 'center' }}>
            2. szint teljesítve — minden csoport feltörte a kódot!
          </p>
        )}

        <button
          className="btn btn-danger"
          onClick={handleReset}
          disabled={loading === 'reset'}
        >
          {loading === 'reset' ? 'Reset...' : 'Munkamenet reset'}
        </button>

        <button type="button" className="btn" onClick={handleLogout} style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }}>
          Kijelentkezés
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <Link to="/" className="admin-link">[ vissza a csatlakozáshoz ]</Link>
    </div>
  );
}
