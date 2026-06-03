import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSession, type Participant } from '../api';
import { getParticipantId, clearParticipant } from '../auth/participantStorage';
import { useLiveSession } from '../hooks/useLiveSession';

export default function GroupsPage() {
  const navigate = useNavigate();
  const participantId = getParticipantId() ?? '';
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groups, setGroups] = useState<Record<number, string[]>>({});
  const [myGroup, setMyGroup] = useState<number | null>(null);

  const loadSession = useCallback(async () => {
    const session = await fetchSession();
    if (session.phase !== 'grouped') {
      if (session.phase === 'level2hacking') navigate('/level2');
      else if (session.phase === 'level2complete') navigate('/level2/done');
      else if (session.phase === 'lobby') navigate('/');
      else navigate('/hack');
      return;
    }
    setParticipants(session.participants);
    setGroups(session.groups);

    const me = session.participants.find((p) => p.id === participantId);
    setMyGroup(me?.groupNumber ?? null);
  }, [participantId, navigate]);

  const { on } = useLiveSession(loadSession, 2000);

  useEffect(() => {
    if (!participantId) {
      navigate('/');
      return;
    }
    loadSession();
  }, [participantId, navigate, loadSession]);

  useEffect(() => {
    const unsubs = [
      on('GroupsAssigned', () => loadSession()),
      on('Level2Started', () => void loadSession()),
      on('PhaseChanged', () => void loadSession()),
      on('SessionReset', () => {
        clearParticipant();
        navigate('/');
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on, loadSession, navigate]);

  const groupEntries = Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="card">
      <h2 className="card-title">// csoportok kiosztva</h2>
      <p className="card-subtitle">
        Véletlenszerű csoportbeosztás — minden csoportnak saját kódja volt.
        {myGroup !== null && (
          <> Te a <strong style={{ color: 'var(--green)' }}>{myGroup + 1}. csoportba</strong> kerültél.</>
        )}
      </p>

      {groupEntries.map(([num, memberIds]) => {
        const members = memberIds
          .map((id) => participants.find((p) => p.id === id))
          .filter(Boolean) as Participant[];

        const isMyGroup = Number(num) === myGroup;

        return (
          <div
            key={num}
            className="group-card"
            style={isMyGroup ? { borderColor: 'var(--green)' } : undefined}
          >
            <div className="group-title">
              Csoport {Number(num) + 1}
              {isMyGroup && ' ← te'}
            </div>
            {members.map((m) => (
              <div key={m.id} className="group-member">
                {m.name}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
