"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Avatar, Badge, Card, Empty, Field, Icon, Input, Modal, SearchInput, Select, Textarea,
} from "@/components/neu";
import { CONTACT_TYPES, ContactType } from "@/lib/types";
import { PageHead, useLookups } from "./common";

const TYPE_TONE: Record<string, "accent" | "ok" | "warn" | "bad" | "viol" | "neutral" | "ink"> = {
  Lead: "accent",
  Client: "ok",
  Attorney: "viol",
  Witness: "warn",
  "Referral Partner": "ink",
  Company: "neutral",
  "Opposing Counsel": "bad",
};

export default function ContactsView({ focusId }: { focusId?: string | null }) {
  const { db, addContact, pushToast } = useStore();
  const lk = useLookups();
  const [q, setQ] = useState("");
  const [fType, setFType] = useState("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "Witness" as ContactType,
    name: "", email: "", phone: "", company: "", address: "", notes: "", matterId: "",
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return db.contacts.filter((c) => {
      if (fType !== "All" && c.type !== fType) return false;
      if (query) {
        const hay = `${c.name} ${c.email} ${c.phone} ${c.company ?? ""} ${c.notes ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [db.contacts, q, fType]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    db.contacts.forEach((c) => m.set(c.type, (m.get(c.type) ?? 0) + 1));
    return m;
  }, [db.contacts]);

  return (
    <div>
      <PageHead
        title="Contacts"
        sub={`${db.contacts.length} centralized contacts — witnesses, counsel, referral partners, companies`}
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} /> New Contact
          </button>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {["All", ...CONTACT_TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setFType(t)}
            className={`chip shrink-0 cursor-pointer transition-all ${fType === t ? "text-accent shadow-neu-sm" : "text-sub"}`}
          >
            {t}
            <span className="rounded-full bg-base px-1.5 text-[10px] shadow-neu-xs">
              {t === "All" ? db.contacts.length : counts.get(t) ?? 0}
            </span>
          </button>
        ))}
      </div>

      <Card className="mb-4 p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, company, email, phone…" />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Avatar name={c.name} size={40} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-ink">{c.name}</div>
                  {c.company && <div className="truncate text-xs text-faint">{c.company}</div>}
                </div>
              </div>
              <Badge tone={TYPE_TONE[c.type]}>{c.type}</Badge>
            </div>
            <div className="space-y-1 text-xs text-sub">
              <div className="flex items-center gap-2"><Icon name="mail" size={12} className="text-faint" /><span className="truncate">{c.email}</span></div>
              <div className="flex items-center gap-2"><Icon name="phone" size={12} className="text-faint" />{c.phone}</div>
              {c.matterId && (
                <div className="flex items-center gap-2"><Icon name="briefcase" size={12} className="text-faint" /><span className="truncate">{lk.matterName(c.matterId)}</span></div>
              )}
              {c.notes && <p className="mt-2 line-clamp-2 border-t border-[#c6ccd855] pt-2 text-[11px] leading-relaxed text-faint">{c.notes}</p>}
            </div>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <Card><Empty icon="book" title="No contacts found" hint="Add witnesses, opposing counsel, referral partners and companies." /></Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Contact" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ContactType }))}>
              {CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></Field>
          <Field label="Company / firm"><Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} /></Field>
          <Field label="Linked matter">
            <Select value={form.matterId} onChange={(e) => setForm((p) => ({ ...p, matterId: e.target.value }))}>
              <option value="">None</option>
              {db.matters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!form.name.trim()}
            onClick={() => {
              addContact({
                type: form.type, name: form.name, email: form.email, phone: form.phone,
                company: form.company || undefined, address: form.address || undefined,
                notes: form.notes || undefined, matterId: form.matterId || undefined,
              });
              setOpen(false);
              setForm({ type: "Witness", name: "", email: "", phone: "", company: "", address: "", notes: "", matterId: "" });
              pushToast("Contact added");
            }}
          >Add contact</button>
        </div>
      </Modal>
    </div>
  );
}
