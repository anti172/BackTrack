import { adminHeaders } from './auth/adminAuth';
import { apiUrl, NGROK_HEADERS } from './config';

export type SessionPhase =
  | 'lobby'
  | 'hacking'
  | 'grouped'
  | 'level2hacking'
  | 'level2complete';

export interface CodeRules {
  maxOccurrenceEnabled: boolean;
  maxOccurrence: number;
  sumEqualsEnabled: boolean;
  sumEquals: number;
  allUniqueEnabled: boolean;
  noZeroEnabled: boolean;
  minEvenEnabled: boolean;
  minEvenCount: number;
}

export interface RuleCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface Participant {
  id: string;
  name: string;
  lockedPositions: boolean[];
  guessCount: number;
  isHacked: boolean;
  groupNumber: number | null;
}

export interface Session {
  phase: SessionPhase;
  groupCount: number;
  groupSizes: number[];
  groupCodes: Record<number, string>;
  level2Rules: CodeRules;
  participants: Participant[];
  groups: Record<number, string[]>;
}

/** Egyenletes csoportosítás: 17 fő, 5 csoport → [4,4,3,3,3] */
export function computeGroupSizes(total: number, groups: number): number[] {
  if (groups < 1 || total < 1) return [];
  const base = Math.floor(total / groups);
  const remainder = total % groups;
  return Array.from({ length: groups }, (_, i) => base + (i < remainder ? 1 : 0));
}

export const defaultCodeRules = (): CodeRules => ({
  maxOccurrenceEnabled: true,
  maxOccurrence: 2,
  sumEqualsEnabled: true,
  sumEquals: 10,
  allUniqueEnabled: false,
  noZeroEnabled: false,
  minEvenEnabled: false,
  minEvenCount: 2,
});

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      ...NGROK_HEADERS,
      ...init?.headers,
    },
  });
}

export async function adminLogin(username: string, password: string): Promise<string> {
  const res = await apiFetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Belépés sikertelen.');
  const data = await res.json();
  return data.token as string;
}

export async function fetchSession(): Promise<Session> {
  const res = await apiFetch('/api/session', {
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error('Nem sikerült betölteni a munkamenetet.');
  const data = await res.json();
  return {
    phase: data.phase,
    groupCount: data.groupCount ?? 0,
    groupSizes: (data.groupSizes as number[]) ?? [],
    groupCodes: data.groupCodes ?? {},
    level2Rules: mapRules(data.level2Rules),
    participants: data.participants.map(mapParticipant),
    groups: data.groups ?? {},
  };
}

export async function join(name: string): Promise<{ participantId: string; participant: Participant }> {
  const res = await apiFetch('/api/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Csatlakozás sikertelen.');
  }
  const data = await res.json();
  return {
    participantId: data.participantId,
    participant: mapParticipant(data.participant),
  };
}

export async function startHacking(groupCount: number): Promise<void> {
  const res = await apiFetch('/api/admin/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ groupCount }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Indítás sikertelen.');
  }
}

export async function startLevel2(rules: CodeRules): Promise<void> {
  const res = await apiFetch('/api/admin/start-level2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({
      rules: {
        maxOccurrenceEnabled: rules.maxOccurrenceEnabled,
        maxOccurrence: rules.maxOccurrence,
        sumEqualsEnabled: rules.sumEqualsEnabled,
        sumEquals: rules.sumEquals,
        allUniqueEnabled: rules.allUniqueEnabled,
        noZeroEnabled: rules.noZeroEnabled,
        minEvenEnabled: rules.minEvenEnabled,
        minEvenCount: rules.minEvenCount,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? '2. szint indítása sikertelen.');
  }
}

export async function submitGuess(participantId: string, guess: string) {
  const res = await apiFetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantId, guess }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Tipp sikertelen.');
  }
  return res.json();
}

export async function submitLevel2Guess(participantId: string, guess: string) {
  const res = await apiFetch('/api/guess-level2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantId, guess }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Tipp sikertelen.');
  }
  return res.json();
}

export async function resetSession(): Promise<void> {
  await apiFetch('/api/admin/reset', {
    method: 'POST',
    headers: adminHeaders(),
  });
}

function mapParticipant(p: Record<string, unknown>): Participant {
  return {
    id: p.id as string,
    name: p.name as string,
    lockedPositions: p.lockedPositions as boolean[],
    guessCount: p.guessCount as number,
    isHacked: p.isHacked as boolean,
    groupNumber: (p.groupNumber as number | null) ?? null,
  };
}

function mapRules(r: Record<string, unknown> | null | undefined): CodeRules {
  if (!r) return defaultCodeRules();
  return {
    maxOccurrenceEnabled: Boolean(r.maxOccurrenceEnabled),
    maxOccurrence: Number(r.maxOccurrence ?? 2),
    sumEqualsEnabled: Boolean(r.sumEqualsEnabled),
    sumEquals: Number(r.sumEquals ?? 10),
    allUniqueEnabled: Boolean(r.allUniqueEnabled),
    noZeroEnabled: Boolean(r.noZeroEnabled),
    minEvenEnabled: Boolean(r.minEvenEnabled),
    minEvenCount: Number(r.minEvenCount ?? 2),
  };
}

export function describeRules(rules: CodeRules): string[] {
  const lines: string[] = [];
  if (rules.maxOccurrenceEnabled)
    lines.push(`Egy számjegy legfeljebb ${rules.maxOccurrence}× szerepelhet`);
  if (rules.sumEqualsEnabled)
    lines.push(`A számjegyek összege pontosan ${rules.sumEquals}`);
  if (rules.allUniqueEnabled)
    lines.push('Minden számjegy különböző');
  if (rules.noZeroEnabled)
    lines.push('Nincs benne 0');
  if (rules.minEvenEnabled)
    lines.push(`Legalább ${rules.minEvenCount} páros számjegy`);
  return lines;
}
