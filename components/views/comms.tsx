"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge, Card, Empty, Field, Icon, Input, Modal, SearchInput, Segmented, Select, Textarea,
} from "@/components/neu";
import { COMM_TYPES, CommType } from "@/lib/types";
import { cn, fmtDateTime, timeAgo } from "@/lib/utils";
import { PageHead, useLookups } from "./common";
import { navigate } from "@/lib/nav";

const TYPE_ICON: Record<string, string> = {
  Email: "mail",
  SMS: "chat",
  "Phone Call": "phone",
  "Internal Note": "note",
};

const DIR_TONE: Record<string, "ok" | "accent" | "neutral"> = {
  Inbound: "ok",
  Outbound: "accent",
  Internal: "neutral",
};

export default function CommsView() {
  const { db, addComm, pushToast } = useStore();
  const lk = useLookups();
  const [fType, setFType] = useState<"All" | CommType>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "Email" as CommType,
    direction: "Outbound" as "Inbound" | "Outbound" | "Internal",
    toName: "", subject: "", body: "", linkType: "none", linkId: "",
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return db.communications.filter((c) => {
      if (fType !== "All" && c.type !== fType) return false;
      if (query) {
        const hay = `${c.fromName} ${c.toName} ${c.subject ?? ""} ${c.body}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [db.communications, fType, q]);

  const linkOf = (c: (typeof db.communications)[number]) =>
    c.matterId
      ? { label: lk.matterName(c.matterId), view: "matters", id: c.matterId, icon: "briefcase" }
      : c.leadId
      ? { label: lk.leadName(c.leadId), view: "leads", id: c.leadId, icon: "users" }
      : c.clientId
      ? { label: lk.clientName(c.clientId), view: "clients", id: c.clientId, icon: "user-check" }
      : null;

  return (
    <div>
      <PageHead
        title="Communications"
        sub="Unified firm-wide log of email, SMS, calls and internal notes"
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="send" size={16} /> Log Communication
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          options={[
            { value: "All", label: "All" },
            ...COMM_TYPES.map((t) => ({ value: t, label: t, icon: TYPE_ICON[t] })),
          ]}
          value={fType}
          onChange={setFType}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search people, subjects, bodies…" className="w-full sm:w-64" />
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          {filtered.map((c) => {
            const link = linkOf(c);
            return (
              <div key={c.id} className="neu-inset-sm flex gap-3 rounded-xl p-3.5">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-neu-xs",
                    c.direction === "Inbound" ? "text-ok" : c.direction === "Outbound" ? "text-accent" : "text-sub"
                  )}
                >
                  <Icon name={TYPE_ICON[c.type]} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-ink">{c.fromName}</span>
                    <Icon name="arrow-right" size={11} className="text-faint" />
                    <span className="text-xs font-semibold text-sub">{c.toName}</span>
                    <Badge tone={DIR_TONE[c.direction]}>{c.direction}</Badge>
                    <span className="chip text-[10px] text-faint">{c.type}</span>
                    {link && (
                      <button
                        onClick={() => navigate(link.view, link.id)}
                        className="flex items-center gap-1 text-[10px] font-bold text-accent hover:underline"
                      >
                        <Icon name={link.icon} size={10} /> {link.label}
                      </button>
                    )}
                    <span className="tiny ml-auto shrink-0" title={fmtDateTime(c.at)}>{timeAgo(c.at)}</span>
                  </div>
                  {c.subject && <div className="mt-1 text-xs font-bold text-ink">{c.subject}</div>}
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-sub">{c.body}</p>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <Empty icon="message" title="Nothing logged" hint="Log an email, SMS, call or internal note." />
          )}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Communication" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as CommType }))}>
              {COMM_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Direction">
            <Select
              value={form.direction}
              onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value as typeof p.direction }))}
              disabled={form.type === "Internal Note"}
            >
              <option>Outbound</option>
              <option>Inbound</option>
              <option>Internal</option>
            </Select>
          </Field>
          <Field label="To / with"><Input value={form.toName} onChange={(e) => setForm((p) => ({ ...p, toName: e.target.value }))} placeholder="Person or firm" /></Field>
          {form.type === "Email" && (
            <Field label="Subject"><Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} /></Field>
          )}
          <Field label="Link to">
            <Select value={form.linkType} onChange={(e) => setForm((p) => ({ ...p, linkType: e.target.value, linkId: "" }))}>
              <option value="none">None</option>
              <option value="lead">Lead</option>
              <option value="client">Client</option>
              <option value="matter">Matter</option>
            </Select>
          </Field>
          {form.linkType !== "none" && (
            <Field label={form.linkType === "matter" ? "Matter" : form.linkType === "lead" ? "Lead" : "Client"}>
              <Select value={form.linkId} onChange={(e) => setForm((p) => ({ ...p, linkId: e.target.value }))}>
                <option value="">Select…</option>
                {form.linkType === "matter" && db.matters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                {form.linkType === "lead" && db.leads.map((l) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>)}
                {form.linkType === "client" && db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}
          <div className="sm:col-span-2">
            <Field label="Message / summary">
              <Textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="Summary of the conversation, or the message body…" />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!form.body.trim() || !form.toName.trim()}
            onClick={() => {
              const matter = form.linkType === "matter" && form.linkId ? lk.matter(form.linkId) : undefined;
              addComm({
                type: form.type,
                direction: form.type === "Internal Note" ? "Internal" : form.direction,
                toName: form.toName,
                subject: form.subject || undefined,
                body: form.body,
                leadId: form.linkType === "lead" ? form.linkId : undefined,
                clientId: form.linkType === "client" ? form.linkId : matter?.clientId,
                matterId: form.linkType === "matter" ? form.linkId : undefined,
              });
              setOpen(false);
              setForm({ type: "Email", direction: "Outbound", toName: "", subject: "", body: "", linkType: "none", linkId: "" });
              pushToast("Communication logged");
            }}
          >
            <Icon name="send" size={15} /> Log
          </button>
        </div>
      </Modal>
    </div>
  );
}
