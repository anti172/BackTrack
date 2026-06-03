import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSession, submitGuess, type SessionPhase } from '../api';
import { getParticipantId, getParticipantName, clearParticipant } from '../auth/participantStorage';
import { useSignalR } from '../hooks/useSignalR';

export default function HackPage() {
  const navigate = useNavigate();
  const participantId = getParticipantId() ?? '';
  const participantName = getParticipantName();

  const [phase, setPhase] = useState<SessionPhase>('lobby');
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false]);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '']);
  const [guessCount, setGuessCount] = useState(0);
  const [isHacked, setIsHacked] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<boolean[]>([false, false, false, false, false]);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '> Kapcsolódás a szerverhez... OK',
    '> Várakozás az admin indítására...',
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const loadSession = useCallback(async () => {
    const session = await fetchSession();
    setPhase(session.phase);

    const me = session.participants.find((p) => p.id === participantId);
    if (me) {
      setLocked(me.lockedPositions);
      setGuessCount(me.guessCount);
      setIsHacked(me.isHacked);
    }

    if (session.phase === 'grouped') navigate('/groups');
    else if (session.phase === 'level2hacking') navigate('/level2');
    else if (session.phase === 'level2complete') navigate('/level2/done');
    else if (session.phase === 'hacking') {
      setTerminalLines((prev) =>
        prev.some((l) => l.includes('Hackelés'))
          ? prev
          : [...prev, '> [!] Hackelés elindítva — találd ki a 5 számjegyű kódot!']
      );
    }
  }, [participantId, navigate]);

  const { on } = useSignalR(loadSession);

  useEffect(() => {
    if (!participantId) {
      navigate('/');
      return;
    }
    loadSession();
  }, [participantId, navigate, loadSession]);

  useEffect(() => {
    const unsubPhase = on('PhaseChanged', (data: unknown) => {
      const d = data as { phase: string };
      if (d.phase === 'hacking') {
        setPhase('hacking');
        setTerminalLines((prev) => [
          ...prev,
          '> [!] Hackelés elindítva — találd ki a 5 számjegyű kódot!',
        ]);
      }
    });

    const unsubGuess = on('GuessSubmitted', (data: unknown) => {
      const d = data as {
        participantId: string;
        lockedPositions: boolean[];
        isHacked: boolean;
        guessCount: number;
      };
      if (d.participantId !== participantId) return;

      const prevLocked = lockedRef.current;
      setLocked(d.lockedPositions);
      setGuessCount(d.guessCount);
      setIsHacked(d.isHacked);

      const newLocked = d.lockedPositions.filter((v, i) => v && !prevLocked[i]).length;
      if (newLocked > 0) {
        setTerminalLines((prev) => [
          ...prev,
          `> Pozíció feloldva: ${newLocked} számjegy zöld ✓`,
        ]);
      }

      if (d.isHacked) {
        setTerminalLines((prev) => [
          ...prev,
          '> ACCESS GRANTED — Kód feltörve!',
        ]);
      }
    });

    const unsubGroups = on('GroupsAssigned', () => navigate('/groups'));
    const unsubReset = on('SessionReset', () => {
      clearParticipant();
      navigate('/');
    });

    return () => {
      unsubPhase();
      unsubGuess();
      unsubGroups();
      unsubReset();
    };
  }, [on, participantId, navigate]);

  function handleDigitChange(index: number, value: string) {
    if (locked[index]) return;
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== 'hacking' || isHacked || submitting) return;

    const guess = digits.join('');
    if (guess.length !== 5) {
      setError('Mind az 5 számjegyet add meg!');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const prevLocked = [...locked];
      const result = await submitGuess(participantId, guess);

      setLocked(result.lockedPositions);
      setGuessCount(result.guessCount);
      setIsHacked(result.isHacked);

      const mergedDigits = digits.map((d, i) =>
        result.lockedPositions[i] ? (d || guess[i]) : ''
      );
      setDigits(mergedDigits);

      const flash = result.lockedPositions.map(
        (v: boolean, i: number) => !v && !prevLocked[i] && guess[i] !== ''
      );
      setWrongFlash(flash);
      setTimeout(() => setWrongFlash([false, false, false, false, false]), 500);

      setTerminalLines((prev) => [
        ...prev,
        `> Próba #${result.guessCount}: ${guess.split('').map((d: string, i: number) =>
          result.lockedPositions[i] ? `[${d}]` : d
        ).join('')}`,
      ]);

      if (result.isHacked) {
        setTerminalLines((prev) => [...prev, '> ACCESS GRANTED — Kód feltörve!']);
      } else {
        const firstOpen = result.lockedPositions.findIndex((v: boolean) => !v);
        if (firstOpen >= 0) inputRefs.current[firstOpen]?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba.');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'lobby') {
    return (
      <div className="card">
        <h2 className="card-title">// várakozó szoba</h2>
        <div className="waiting">
          <p>Üdv, {participantName}!</p>
          <p style={{ marginTop: '1rem' }}>
            Várakozás az admin indítására<span className="dot">...</span>
          </p>
        </div>
        <div className="terminal" style={{ marginTop: '1.5rem' }}>
          {terminalLines.map((line, i) => (
            <div key={i} className="terminal-line">{line}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">// hack terminál</h2>
      <p className="card-subtitle">
        Találd ki a 5 számjegyű kódot! Ha egy számjegy a helyén van, zöldre vált és kizárólagosan lockolódik.
      </p>

      {isHacked && (
        <div className="hacked-banner">
          ✓ ACCESS GRANTED — Várakozás a csoportosításra...
        </div>
      )}

      <div className="terminal">
        {terminalLines.slice(-6).map((line, i) => (
          <div
            key={i}
            className={`terminal-line ${line.includes('GRANTED') ? 'success' : line.includes('[!]') ? 'warning' : ''}`}
          >
            {line}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="digit-row">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              className={`digit-cell ${locked[i] ? 'locked' : ''} ${wrongFlash[i] ? 'wrong' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={locked[i] ? (digit || '·') : digit}
              disabled={locked[i] || isHacked}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              readOnly={locked[i]}
            />
          ))}
        </div>

        {!isHacked && (
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Ellenőrzés...' : 'Kód küldése →'}
          </button>
        )}

        {error && <p className="error">{error}</p>}

        <div className="stats">
          <span>Operátor: {participantName}</span>
          <span>Próbálkozások: {guessCount}</span>
          <span>Feloldva: {locked.filter(Boolean).length}/5</span>
        </div>
      </form>
    </div>
  );
}
