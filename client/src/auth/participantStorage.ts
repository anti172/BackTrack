const ID_KEY = 'participantId';
const NAME_KEY = 'participantName';

export function getParticipantId(): string | null {
  return sessionStorage.getItem(ID_KEY);
}

export function getParticipantName(): string {
  return sessionStorage.getItem(NAME_KEY) ?? 'Ismeretlen';
}

export function setParticipant(id: string, name: string): void {
  sessionStorage.setItem(ID_KEY, id);
  sessionStorage.setItem(NAME_KEY, name);
}

export function clearParticipant(): void {
  sessionStorage.removeItem(ID_KEY);
  sessionStorage.removeItem(NAME_KEY);
}
