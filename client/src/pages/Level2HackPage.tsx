import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchSession,
  submitLevel2Guess,
  describeRules,
  type RuleCheck,
  type CodeRules,
} from '../api';
import { getParticipantId, getParticipantName, clearParticipant } from '../auth/participantStorage';
import { useLiveSession } from '../hooks/useLiveSession';

export default function Level2HackPage() {
  const navigate = useNavigate();
  const participantId = getParticipantId() ?? '';
  const participantName = getParticipantName();

  const [rules, setRules] = useState<CodeRules | null>(null);
  const [locked, setLocked] = useState<boolean[]>([false, false, false, false, false]);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '']);
  const [guessCount, setGuessCount] = useState(0);
  const [isHacked, setIsHacked] = useState(false);
  const [ruleChecks, setRuleChecks] = useState<RuleCheck[]>([]);
  const [wrongFlash, setWrongFlash] = useState<boolean[]>([false, false, false, false, false]);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    '> 2. szint — szabályalapú backtracking',
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const loadSession = useCallback(async () => {
    const session = await fetchSession();

    if (session.phase === 'level2complete') {
      navigate('/level2/done');
      return;
    }
    if (session.phase !== 'level2hacking') {
      if (session.phase === 'grouped') navigate('/groups');
      else if (session.phase === 'hacking') navigate('/hack');
      else navigate('/');
      return;
    }

    setRules(session.level2Rules);
    const me = session.participants.find((p) => p.id === participantId);
    if (me) {
      setLocked(me.lockedPositions);
      setGuessCount(me.guessCount);
      setIsHacked(me.isHacked);
    }
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
      on('Level2Started', () => loadSession()),
      on('Level2GuessSubmitted', (data: unknown) => {
        const d = data as {
          participantId: string;
          lockedPositions: boolean[];
          isHacked: boolean;
          guessCount: number;
          ruleChecks: RuleCheck[];
        };
        if (d.participantId !== participantId) return;

        const prevLocked = lockedRef.current;
        setLocked(d.lockedPositions);
        setGuessCount(d.guessCount);
        setIsHacked(d.isHacked);
        setRuleChecks(d.ruleChecks ?? []);

        const newLocked = d.lockedPositions.filter((v, i) => v && !prevLocked[i]).length;
        if (newLocked > 0) {
          setTerminalLines((prev) => [
            ...prev,
            `> Pozíció feloldva: ${newLocked} számjegy zöld ✓`,
          ]);
        }
        if (d.isHacked) {
          setTerminalLines((prev) => [...prev, '> LEVEL 2 CLEARED — Kód feltörve!']);
        }
      }),
      on('Level2Complete', () => void loadSession()),
      on('SessionReset', () => {
        clearParticipant();
        navigate('/');
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on, participantId, navigate, loadSession]);

  function handleDigitChange(index: number, value: string) {
    if (locked[index]) return;
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 4) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isHacked || submitting) return;

    const guess = digits.join('');
    if (guess.length !== 5) {
      setError('Mind az 5 számjegyet add meg!');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const prevLocked = [...locked];
      const result = await submitLevel2Guess(participantId, guess);

      setLocked(result.lockedPositions);
      setGuessCount(result.guessCount);
      setIsHacked(result.isHacked);
      setRuleChecks(result.ruleChecks ?? []);

      const mergedDigits = digits.map((d, i) =>
        result.lockedPositions[i] ? (d || guess[i]) : ''
      );
      setDigits(mergedDigits);

      const flash = result.lockedPositions.map(
        (v: boolean, i: number) => !v && !prevLocked[i] && guess[i] !== ''
      );
      setWrongFlash(flash);
      setTimeout(() => setWrongFlash([false, false, false, false, false]), 500);

      const passedRules = (result.ruleChecks ?? []).filter((r: RuleCheck) => r.passed).length;
      const totalRules = (result.ruleChecks ?? []).length;
      setTerminalLines((prev) => [
        ...prev,
        `> Próba #${result.guessCount}: szabályok ${passedRules}/${totalRules} ✓`,
      ]);

      if (result.isHacked) {
        setTerminalLines((prev) => [...prev, '> LEVEL 2 CLEARED — Kód feltörve!']);
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

  const ruleLines = rules ? describeRules(rules) : [];

  return (
    <div className="card">
      <h2 className="card-title">// 2. szint — szabályok</h2>
      <p className="card-subtitle">
        A kód a lenti szabályoknak megfelelő 5 számjegy. Használj visszalépéses keresést:
        szűkítsd a lehetőségeket a szabályok alapján, majd próbáld a pozíciókat!
      </p>

      {rules && (
        <div className="rules-panel">
          <div className="rules-title">Aktív szabályok</div>
          <ul className="rules-list">
            {ruleLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {isHacked && (
        <div className="hacked-banner">
          ✓ LEVEL 2 CLEARED — Várakozás a többiekre...
        </div>
      )}

      {ruleChecks.length > 0 && (
        <div className="rule-checks">
          {ruleChecks.map((r) => (
            <div key={r.id} className={`rule-check ${r.passed ? 'pass' : 'fail'}`}>
              {r.passed ? '✓' : '✗'} {r.label}
            </div>
          ))}
        </div>
      )}

      <div className="terminal">
        {terminalLines.slice(-5).map((line, i) => (
          <div
            key={i}
            className={`terminal-line ${line.includes('CLEARED') ? 'success' : ''}`}
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
