export type RelationshipType = "Boss" | "Client" | "Partner" | "Colleague" | "Friend" | "Family" | "Other";

export interface VaultContact {
  id: string;
  name: string;
  relationshipType: RelationshipType;
  notes: string;
  createdAt: number;
}

const VAULT_KEY = "solenq-vault";
export const MAX_VAULT_CONTACTS = 20;

export function loadContacts(): VaultContact[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VaultContact[];
  } catch {
    return [];
  }
}

export function saveContact(contact: VaultContact): { ok: boolean; error?: string } {
  const list = loadContacts();
  const isEdit = list.some((c) => c.id === contact.id);
  if (!isEdit && list.length >= MAX_VAULT_CONTACTS) {
    return { ok: false, error: `Max ${MAX_VAULT_CONTACTS} contacts on free tier.` };
  }
  const updated = isEdit ? list.map((c) => (c.id === contact.id ? contact : c)) : [...list, contact];
  localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
  return { ok: true };
}

export function deleteContact(id: string) {
  const list = loadContacts().filter((c) => c.id !== id);
  localStorage.setItem(VAULT_KEY, JSON.stringify(list));
}

export function findMatchingContact(text: string): VaultContact | null {
  if (!text.trim() || text.length < 3) return null;
  const contacts = loadContacts();
  const lower = text.toLowerCase();
  for (const c of contacts) {
    const parts = c.name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
    if (parts.some((p) => lower.includes(p))) return c;
  }
  return null;
}
