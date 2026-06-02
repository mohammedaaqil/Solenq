import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type VaultContact,
  type RelationshipType,
  saveContact,
  MAX_VAULT_CONTACTS,
  loadContacts,
} from "@/lib/vault";

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "Boss", "Client", "Partner", "Colleague", "Friend", "Family", "Other",
];

interface VaultPanelProps {
  open: boolean;
  editingContact: VaultContact | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function VaultPanel({ open, editingContact, onClose, onSaved }: VaultPanelProps) {
  const [name, setName] = useState("");
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("Client");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingContact) {
      setName(editingContact.name);
      setRelationshipType(editingContact.relationshipType);
      setNotes(editingContact.notes);
    } else {
      setName("");
      setRelationshipType("Client");
      setNotes("");
    }
    setError(null);
  }, [editingContact, open]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Name is required."); return; }
    setSaving(true);
    const contact: VaultContact = {
      id: editingContact?.id || crypto.randomUUID(),
      name: trimmedName,
      relationshipType,
      notes: notes.trim(),
      createdAt: editingContact?.createdAt || Date.now(),
    };
    const result = saveContact(contact);
    setSaving(false);
    if (!result.ok) { setError(result.error || "Could not save."); return; }
    onSaved();
    onClose();
  };

  const contactCount = loadContacts().length;
  const atLimit = !editingContact && contactCount >= MAX_VAULT_CONTACTS;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col",
          "transition-transform duration-300 ease-out"
        )}
        style={{
          width: 360,
          background: "hsl(var(--surface))",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.35), -1px 0 0 rgba(255,255,255,0.04)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 shrink-0"
          style={{ height: 64, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--foreground))" }}>
            {editingContact ? "Edit person" : "Save a person"}
          </p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-secondary/40 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {atLimit && (
            <div
              className="rounded-xl p-3 text-xs"
              style={{
                background: "hsl(var(--primary) / 0.06)",
                border: "1px solid hsl(var(--primary) / 0.15)",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              You've reached the {MAX_VAULT_CONTACTS}-contact limit on the free tier.
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--muted-foreground))", opacity: 0.6, letterSpacing: "0.06em" }}>
              NAME
            </label>
            <input
              type="text"
              placeholder="e.g. My boss Sarah"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 14,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.35)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            />
          </div>

          {/* Relationship type */}
          <div className="space-y-2">
            <label style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--muted-foreground))", opacity: 0.6, letterSpacing: "0.06em" }}>
              RELATIONSHIP
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all appearance-none cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 14,
                color: "hsl(var(--foreground))",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.35)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t} value={t} style={{ background: "hsl(var(--card))" }}>{t}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--muted-foreground))", opacity: 0.6, letterSpacing: "0.06em" }}>
              WHAT SHOULD SOLENQ KNOW ABOUT THEM?
            </label>
            <textarea
              placeholder="e.g. She tends to be defensive when deadlines are mentioned. Prefers indirect asks. Values loyalty."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none resize-none transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 14,
                lineHeight: 1.6,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.35)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: "hsl(var(--destructive))", opacity: 0.85 }}>{error}</p>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 shrink-0 flex gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <Button
            onClick={handleSave}
            disabled={saving || atLimit}
            className="flex-1 btn-solenq rounded-xl h-10 text-[13px] font-semibold border-0"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl h-10 px-4 text-[13px]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
}
