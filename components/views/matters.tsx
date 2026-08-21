"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Avatar, Badge, Card, ConfirmModal, Empty, Field, Icon, Input, Kebab,
  Modal, SearchInput, Section, Select, Tabs, Textarea, Timeline,
} from "@/components/neu";
import {
  EVENT_TYPES, MATTER_STATUSES, Matter, MatterStatus, PRACTICE_AREAS,
  PRIORITIES, Priority,
} from "@/lib/types";
import {
  MATTER_STATUS_TONE, PRIORITY_TONE, cn, daysUntil, fmtDate, fmtDateShort,
  fmtDateTime, fmtMoney, fmtTime, isPastDate, timeAgo, todayISO,
} from "@/lib/utils";
import {
  PageHead, TASK_TONE, downloadDemo, effectiveTaskStatus, extColor, fmtKb,
  invBal, invPaid, invTotal, useLookups,
} from "./common";
import { navigate } from "@/lib/nav";

type MatterTab =
  | "overview" | "people" | "documents" | "tasks" | "calendar" | "notes"
  | "communications" | "time" | "expenses" | "billing" | "activity";

export default function MattersView({ focusId }: { focusId?: string | null }) {
  const { db, can, updateMatter } = useStore();
  const lk = useLookups();
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fPA, setFPA] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [fAttorney, setFAttorney] = useState("All");

  useEffect(() => {
    if (focusId && db.matters.some((m) => m.id === focusId)) setSelected(focusId);
  }, [focusId, db.matters]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return db.matters.filter((m) => {
      if (fPA !== "All" && m.practiceArea !== fPA) return false;
      if (fStatus !== "All" && m.status !== fStatus) return false;
      if (fAttorney !== "All" && m.attorneyId !== fAttorney) return false;
      if (query) {
        const hay = `${m.name} ${m.number} ${lk.clientName(m.clientId)} ${m.opposingParty ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [db.matters, q, fPA, fStatus, fAttorney, lk]);

  const attorneys = db.users.filter((u) => u.role === "attorney" || u.role === "super_admin");

  if (selected) {
    const m = db.matters.find((x) => x.id === selected);
    if (m) return <MatterDetail matter={m} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <PageHead
        title="Matters"
        sub={`${db.matters.filter((m) => m.status !== "Closed").length} active · ${db.matters.length} total`}
      />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search matter, number, client, opposing party…" className="w-full sm:w-72" />
        <Select value={fPA} onChange={(e) => setFPA(e.target.value)} className="w-40">
          <option>All</option>
          {PRACTICE_AREAS.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="w-40">
          <option>All</option>
          {MATTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={fAttorney} onChange={(e) => setFAttorney(e.target.value)} className="w-44">
          <option value="All">All attorneys</option>
          {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="border-b border-[#c6ccd866]">
              <tr>
                <th className="th">Matter</th>
                <th className="th">Client</th>
                <th className="th">Practice Area</th>
                <th className="th">Attorney</th>
                <th className="th">Status</th>
                <th className="th">Priority</th>
                <th className="th">Next Deadline</th>
                <th className="th text-right">Value</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="tr cursor-pointer border-b border-[#c6ccd833] last:border-0" onClick={() => setSelected(m.id)}>
                  <td className="td">
                    <div className="font-bold">{m.name}</div>
                    <div className="text-[11px] font-semibold text-faint">{m.number}</div>
                  </td>
                  <td className="td text-xs font-semibold">{lk.clientName(m.clientId)}</td>
                  <td className="td text-xs font-semibold">{m.practiceArea}</td>
                  <td className="td">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Avatar name={lk.userName(m.attorneyId)} size={22} />
                      <span className="hidden xl:inline">{lk.userName(m.attorneyId)}</span>
                    </div>
                  </td>
                  <td className="td"><Badge tone={MATTER_STATUS_TONE[m.status]}>{m.status}</Badge></td>
                  <td className="td"><Badge tone={PRIORITY_TONE[m.priority]}>{m.priority}</Badge></td>
                  <td className="td">
                    {m.nextDeadline ? (
                      <span className={cn("text-xs font-bold", daysUntil(m.nextDeadline) <= 3 ? "text-bad" : "text-sub")}>
                        {fmtDateShort(m.nextDeadline)}
                        <span className="ml-1 text-[10px] text-faint">({daysUntil(m.nextDeadline)}d)</span>
                      </span>
                    ) : <span className="text-xs text-faint">—</span>}
                  </td>
                  <td className="td text-right font-bold">{fmtMoney(m.caseValue)}</td>
                  <td className="td">
                    <Kebab items={[
                      { label: "Open matter", icon: "arrow-right", onClick: () => setSelected(m.id) },
                      ...(m.status !== "Closed"
                        ? [{ label: "Close matter", icon: "check", onClick: () => updateMatter(m.id, { status: "Closed", closeDate: todayISO() }) }]
                        : [{ label: "Reopen matter", icon: "history", onClick: () => updateMatter(m.id, { status: "Open", closeDate: undefined }) }]),
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon="briefcase" title="No matters match" hint="Adjust your filters." />}
        </div>
      </Card>
    </div>
  );
}

/* ================= Matter detail ================= */

function MatterDetail({ matter, onBack }: { matter: Matter; onBack: () => void }) {
  const {
    db, user, updateMatter, addTask, updateTask, addAppointment, addComm, addNote,
    addDoc, updateDoc, deleteDoc, addDocVersion, addTimeEntry, addExpense,
    addInvoice, recordPayment, pushToast, logAudit,
  } = useStore();
  const lk = useLookups();
  const [tab, setTab] = useState<MatterTab>("overview");

  const m = db.matters.find((x) => x.id === matter.id) ?? matter;
  const client = lk.client(m.clientId);
  const contacts = db.contacts.filter((c) => c.matterId === m.id);
  const docs = db.documents.filter((d) => d.matterId === m.id);
  const tasks = db.tasks.filter((t) => t.matterId === m.id);
  const appts = db.appointments.filter((a) => a.matterId === m.id).sort((a, b) => a.date.localeCompare(b.date));
  const notes = db.notes.filter((n) => n.matterId === m.id);
  const comms = db.communications.filter((c) => c.matterId === m.id);
  const times = db.timeEntries.filter((t) => t.matterId === m.id);
  const expenses = db.expenses.filter((e) => e.matterId === m.id);
  const invoices = db.invoices.filter((i) => i.matterId === m.id);
  const acts = db.activities.filter((a) => a.matterId === m.id);

  const hoursTotal = times.reduce((s, t) => s + t.hours, 0);
  const billedValue = times.reduce((s, t) => s + t.hours * t.rate, 0);
  const expTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const outstanding = invoices.reduce((s, i) => s + invBal(i), 0);
  const openTasks = tasks.filter((t) => t.status !== "Completed").length;

  /* form states */
  const [noteText, setNoteText] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", assigneeId: user?.id ?? m.attorneyId, priority: "Medium", dueDate: todayISO(), notes: "" });
  const [apptOpen, setApptOpen] = useState(false);
  const [apptForm, setApptForm] = useState({ title: "", type: "Client Meeting", date: todayISO(), startTime: "10:00", endTime: "11:00", location: "" });
  const [commOpen, setCommOpen] = useState(false);
  const [commForm, setCommForm] = useState({ type: "Email", toName: client?.name ?? "", subject: "", body: "" });
  const [docOpen, setDocOpen] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", ext: "pdf" });
  const [renDoc, setRenDoc] = useState<{ id: string; name: string } | null>(null);
  const [delDoc, setDelDoc] = useState<string | null>(null);
  const [verDoc, setVerDoc] = useState<string | null>(null);
  const [verNote, setVerNote] = useState("");
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeForm, setTimeForm] = useState({ date: todayISO(), hours: 1, rate: lk.user(m.attorneyId)?.hourlyRate ?? 350, description: "", billable: true });
  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({ date: todayISO(), amount: 0, category: "Filing Fee", description: "", billable: true });
  const [invOpen, setInvOpen] = useState(false);
  const [invForm, setInvForm] = useState({ dueInDays: 14, items: [{ desc: "", amount: 0 }] });
  const [payInv, setPayInv] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: "Card" });

  const paralegal = m.paralegalId ? lk.user(m.paralegalId) : undefined;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button className="icon-btn" onClick={onBack} title="Back to matters">
          <Icon name="chevron-left" size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-ink">{m.name}</h1>
            <Badge tone={MATTER_STATUS_TONE[m.status]}>{m.status}</Badge>
            <Badge tone={PRIORITY_TONE[m.priority]}>{m.priority}</Badge>
          </div>
          <p className="text-xs font-semibold text-faint">
            {m.number} · {m.practiceArea} · opened {fmtDate(m.openDate)}
            {m.closeDate ? ` · closed ${fmtDate(m.closeDate)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={m.status}
            onChange={(e) => {
              const s = e.target.value as MatterStatus;
              updateMatter(m.id, { status: s, closeDate: s === "Closed" ? todayISO() : undefined });
              logAudit("UPDATE", "matter", `${m.number} status → ${s}`);
              pushToast(`Matter moved to "${s}"`);
            }}
            className="w-40"
          >
            {MATTER_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </div>
      </div>

      {/* Key people strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Client", value: client?.name ?? "—", icon: "user-check", onClick: () => navigate("clients", m.clientId) },
          { label: "Attorney", value: lk.userName(m.attorneyId), icon: "user" },
          { label: "Paralegal", value: paralegal?.name ?? "—", icon: "users" },
          { label: "Court", value: m.court ?? "—", icon: "building" },
        ].map((c) => (
          <Card key={c.label} onClick={c.onClick} className="flex items-center gap-3 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-accent shadow-neu-in-sm">
              <Icon name={c.icon} size={16} />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide text-faint">{c.label}</div>
              <div className="truncate text-xs font-bold text-ink">{c.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => setTab(v as MatterTab)}
        options={[
          { value: "overview", label: "Overview" },
          { value: "people", label: `People (${contacts.length + 2})` },
          { value: "documents", label: `Documents (${docs.length})` },
          { value: "tasks", label: `Tasks (${tasks.length})` },
          { value: "calendar", label: `Calendar (${appts.length})` },
          { value: "notes", label: `Notes (${notes.length})` },
          { value: "communications", label: `Comms (${comms.length})` },
          { value: "time", label: `Time (${times.length})` },
          { value: "expenses", label: `Expenses (${expenses.length})` },
          { value: "billing", label: `Billing (${invoices.length})` },
          { value: "activity", label: "Activity" },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Section className="lg:col-span-2" title="Case summary">
            <p className="mb-4 text-[13px] leading-relaxed text-sub">{m.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Opposing party", m.opposingParty ?? "—"],
                ["Next deadline", m.nextDeadline ? `${fmtDate(m.nextDeadline)} (${daysUntil(m.nextDeadline)}d)` : "—"],
                ["Case value", fmtMoney(m.caseValue)],
                ["Open date", fmtDate(m.openDate)],
              ].map(([k, v]) => (
                <div key={k} className="neu-inset-sm rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-faint">{k}</div>
                  <div className="mt-0.5 text-xs font-bold text-ink">{v}</div>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Matter health">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Open tasks", String(openTasks)],
                ["Documents", String(docs.length)],
                ["Hours billed", hoursTotal.toFixed(1)],
                ["Time value", fmtMoney(billedValue)],
                ["Expenses", fmtMoney(expTotal)],
                ["Outstanding", fmtMoney(outstanding)],
              ].map(([k, v]) => (
                <div key={k} className="neu-inset-sm rounded-xl p-3 text-center">
                  <div className="text-base font-extrabold text-ink">{v}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-faint">{k}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === "people" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: client?.name ?? "—", role: "Client", sub: client?.email, color: "#2f9e77" },
            { name: lk.userName(m.attorneyId), role: "Attorney", sub: lk.user(m.attorneyId)?.email, color: "#2f6bff" },
            ...(paralegal ? [{ name: paralegal.name, role: "Paralegal", sub: paralegal.email, color: "#0e9bb5" }] : []),
            ...(m.opposingParty ? [{ name: m.opposingParty, role: "Opposing Party", sub: m.court, color: "#d05555" }] : []),
            ...contacts.map((c) => ({ name: c.name, role: c.type, sub: c.company ?? c.email, color: "#5d6b8c" })),
          ].map((p, i) => (
            <Card key={i} className="flex items-center gap-3 p-4">
              <Avatar name={p.name} color={p.color} size={40} />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-ink">{p.name}</div>
                <div className="truncate text-xs text-faint">{p.sub}</div>
                <span className="mt-1 inline-block rounded-full bg-base px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent shadow-neu-xs">
                  {p.role}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "documents" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-faint">Folder: {m.number} {client?.name.split(" ")[0]}</span>
            <button className="btn-primary" onClick={() => { setDocForm({ name: "", ext: "pdf" }); setDocOpen(true); }}>
              <Icon name="upload" size={15} /> Upload
            </button>
          </div>
          <div className="space-y-2">
            {docs.length === 0 && <Empty icon="folder" title="No documents in this matter" />}
            {docs.map((d2) => (
              <div key={d2.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-neu-xs" style={{ background: extColor(d2.ext) }}>
                  <Icon name="file" size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-ink">{d2.name}</div>
                  <div className="text-[10px] font-semibold text-faint">
                    {fmtKb(d2.sizeKb)} · v{d2.versions.length} · {lk.userName(d2.uploadedById)} · {timeAgo(d2.uploadedAt)}
                  </div>
                </div>
                <Kebab items={[
                  { label: "Download", icon: "download", onClick: () => downloadDemo(d2.name, d2.name) },
                  { label: "Rename", icon: "pencil", onClick: () => setRenDoc({ id: d2.id, name: d2.name }) },
                  { label: "New version", icon: "history", onClick: () => { setVerDoc(d2.id); setVerNote(""); } },
                  { label: "Delete", icon: "trash", danger: true, onClick: () => setDelDoc(d2.id) },
                ]} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "tasks" && (
        <Card className="p-4">
          <div className="mb-3 flex justify-end">
            <button className="btn-primary" onClick={() => setTaskOpen(true)}><Icon name="plus" size={15} /> New Task</button>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 && <Empty icon="check-square" title="No tasks yet" />}
            {tasks.map((t) => {
              const eff = effectiveTaskStatus(t);
              return (
                <div key={t.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                  <button
                    className="icon-btn h-7 w-7 shrink-0"
                    title={t.status === "Completed" ? "Reopen" : "Complete"}
                    onClick={() => updateTask(t.id, { status: t.status === "Completed" ? "To Do" : "Completed" })}
                  >
                    <Icon name={t.status === "Completed" ? "history" : "check"} size={13} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-xs font-bold text-ink", t.status === "Completed" && "line-through opacity-60")}>{t.title}</div>
                    <div className="text-[10px] font-semibold text-faint">{lk.userName(t.assigneeId)} · due {fmtDateShort(t.dueDate)}</div>
                  </div>
                  <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  <Badge tone={TASK_TONE[eff]}>{eff}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === "calendar" && (
        <Card className="p-4">
          <div className="mb-3 flex justify-end">
            <button className="btn-primary" onClick={() => setApptOpen(true)}><Icon name="plus" size={15} /> New Event</button>
          </div>
          <div className="space-y-2">
            {appts.length === 0 && <Empty icon="calendar" title="No events scheduled" />}
            {appts.map((a) => (
              <div key={a.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                <span className="timeline-dot" style={{ color: "#2f6bff" }}><Icon name="calendar" size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-ink">{a.title}</div>
                  <div className="text-[10px] font-semibold text-faint">
                    {fmtDate(a.date)} · {fmtTime(a.startTime)}–{fmtTime(a.endTime)}{a.location ? ` · ${a.location}` : ""}
                  </div>
                </div>
                <Badge tone={isPastDate(a.date) ? "neutral" : "accent"}>{a.type}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "notes" && (
        <Card className="p-4">
          <div className="mb-3 flex gap-2">
            <Input placeholder="Add a case note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <button
              className="btn-primary shrink-0"
              disabled={!noteText.trim()}
              onClick={() => { addNote(noteText, { matterId: m.id, clientId: m.clientId }); setNoteText(""); pushToast("Note added"); }}
            >
              <Icon name="plus" size={15} />
            </button>
          </div>
          <div className="space-y-2">
            {notes.length === 0 && <Empty icon="note" title="No notes yet" />}
            {notes.map((n) => (
              <div key={n.id} className="neu-inset-sm rounded-xl p-3.5">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-sub">{n.body}</p>
                <div className="tiny mt-2">{lk.userName(n.authorId)} · {timeAgo(n.at)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "communications" && (
        <Card className="p-4">
          <div className="mb-3 flex justify-end">
            <button className="btn-primary" onClick={() => { setCommForm({ type: "Email", toName: client?.name ?? "", subject: "", body: "" }); setCommOpen(true); }}>
              <Icon name="send" size={15} /> Log Communication
            </button>
          </div>
          <div className="space-y-2">
            {comms.length === 0 && <Empty icon="message" title="No communications logged" />}
            {comms.map((c) => (
              <div key={c.id} className="neu-inset-sm rounded-xl p-3.5">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-ink">
                    <Icon name={c.type === "Email" ? "mail" : c.type === "SMS" ? "chat" : c.type === "Phone Call" ? "phone" : "note"} size={13} className="text-accent" />
                    {c.type}
                    <Badge tone={c.direction === "Inbound" ? "ok" : c.direction === "Outbound" ? "accent" : "neutral"}>{c.direction}</Badge>
                  </div>
                  <span className="tiny">{fmtDateTime(c.at)}</span>
                </div>
                <div className="text-[11px] font-semibold text-faint">{c.fromName} → {c.toName}</div>
                {c.subject && <div className="mt-1 text-xs font-bold text-ink">{c.subject}</div>}
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-sub">{c.body}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "time" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-faint">{hoursTotal.toFixed(1)} hrs · {fmtMoney(billedValue)} value</span>
            <button className="btn-primary" onClick={() => setTimeOpen(true)}><Icon name="clock" size={15} /> Log Time</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead><tr className="border-b border-[#c6ccd866]"><th className="th">Date</th><th className="th">User</th><th className="th">Description</th><th className="th text-right">Hours</th><th className="th text-right">Rate</th><th className="th text-right">Value</th></tr></thead>
              <tbody>
                {times.map((t) => (
                  <tr key={t.id} className="border-b border-[#c6ccd833] last:border-0">
                    <td className="td text-xs font-semibold">{fmtDateShort(t.date)}</td>
                    <td className="td text-xs">{lk.userName(t.userId)}</td>
                    <td className="td text-xs text-sub">{t.description}</td>
                    <td className="td text-right text-xs font-bold">{t.hours.toFixed(1)}</td>
                    <td className="td text-right text-xs">{fmtMoney(t.rate)}</td>
                    <td className="td text-right text-xs font-bold">{fmtMoney(t.hours * t.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {times.length === 0 && <Empty icon="clock" title="No time entries" />}
          </div>
        </Card>
      )}

      {tab === "expenses" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-faint">{fmtMoney(expTotal)} total</span>
            <button className="btn-primary" onClick={() => setExpOpen(true)}><Icon name="plus" size={15} /> Add Expense</button>
          </div>
          <div className="space-y-2">
            {expenses.length === 0 && <Empty icon="card" title="No expenses" />}
            {expenses.map((e2) => (
              <div key={e2.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                <span className="timeline-dot text-warn"><Icon name="card" size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-ink">{e2.description}</div>
                  <div className="text-[10px] font-semibold text-faint">{e2.category} · {fmtDateShort(e2.date)}</div>
                </div>
                <span className="text-xs font-bold text-ink">{fmtMoney(e2.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "billing" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-faint">Outstanding: {fmtMoney(outstanding)}</span>
            <button className="btn-primary" onClick={() => { setInvForm({ dueInDays: 14, items: [{ desc: "", amount: 0 }] }); setInvOpen(true); }}>
              <Icon name="plus" size={15} /> New Invoice
            </button>
          </div>
          <div className="space-y-2">
            {invoices.length === 0 && <Empty icon="money" title="No invoices for this matter" />}
            {invoices.map((inv) => (
              <div key={inv.id} className="neu-inset-sm flex flex-wrap items-center gap-3 rounded-xl p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-ink">{inv.number}</div>
                  <div className="text-[10px] font-semibold text-faint">
                    Issued {fmtDateShort(inv.issueDate)} · due {fmtDateShort(inv.dueDate)} · paid {fmtMoney(invPaid(inv))} of {fmtMoney(invTotal(inv))}
                  </div>
                </div>
                <Badge tone={inv.status === "Paid" ? "ok" : inv.status === "Overdue" ? "bad" : inv.status === "Partial" ? "warn" : "accent"}>{inv.status}</Badge>
                <span className="text-xs font-bold text-ink">{fmtMoney(invBal(inv))}</span>
                {invBal(inv) > 0 && (
                  <button
                    className="btn-sm"
                    onClick={() => { setPayInv(inv.id); setPayForm({ amount: invBal(inv), method: "Card" }); }}
                  >
                    <Icon name="money" size={13} /> Record payment
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "activity" && (
        <Card className="p-4">
          <Timeline
            items={acts.map((a) => ({ id: a.id, at: a.at, icon: "dot", title: a.text, body: `by ${a.actor}` }))}
            renderTime={(iso) => fmtDateTime(iso)}
          />
        </Card>
      )}

      {/* ---------- modals ---------- */}

      <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="New Task">
        <div className="space-y-3">
          <Field label="Task name"><Input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee">
              <Select value={taskForm.assigneeId} onChange={(e) => setTaskForm((p) => ({ ...p, assigneeId: e.target.value }))}>
                {db.users.filter((u) => u.role !== "client").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
            <Field label="Due date"><Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))} /></Field>
            <Field label="Priority">
              <Select value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Notes"><Textarea value={taskForm.notes} onChange={(e) => setTaskForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setTaskOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!taskForm.title.trim()}
              onClick={() => {
                addTask({ title: taskForm.title, assigneeId: taskForm.assigneeId, matterId: m.id, clientId: m.clientId, priority: taskForm.priority as Priority, dueDate: taskForm.dueDate, notes: taskForm.notes || undefined });
                setTaskOpen(false);
                setTaskForm((p) => ({ ...p, title: "", notes: "" }));
                pushToast("Task created");
              }}
            >Create</button>
          </div>
        </div>
      </Modal>

      <Modal open={apptOpen} onClose={() => setApptOpen(false)} title="New Event">
        <div className="space-y-3">
          <Field label="Title"><Input value={apptForm.title} onChange={(e) => setApptForm((p) => ({ ...p, title: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={apptForm.type} onChange={(e) => setApptForm((p) => ({ ...p, type: e.target.value }))}>
                {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Date"><Input type="date" value={apptForm.date} onChange={(e) => setApptForm((p) => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Start"><Input type="time" value={apptForm.startTime} onChange={(e) => setApptForm((p) => ({ ...p, startTime: e.target.value }))} /></Field>
            <Field label="End"><Input type="time" value={apptForm.endTime} onChange={(e) => setApptForm((p) => ({ ...p, endTime: e.target.value }))} /></Field>
          </div>
          <Field label="Location"><Input value={apptForm.location} onChange={(e) => setApptForm((p) => ({ ...p, location: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setApptOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!apptForm.title.trim()}
              onClick={() => {
                addAppointment({ title: apptForm.title, type: apptForm.type as (typeof EVENT_TYPES)[number], date: apptForm.date, startTime: apptForm.startTime, endTime: apptForm.endTime, matterId: m.id, clientId: m.clientId, attendeeIds: [m.attorneyId], location: apptForm.location || undefined });
                setApptOpen(false);
                setApptForm((p) => ({ ...p, title: "" }));
                pushToast("Event scheduled");
              }}
            >Schedule</button>
          </div>
        </div>
      </Modal>

      <Modal open={commOpen} onClose={() => setCommOpen(false)} title="Log Communication">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={commForm.type} onChange={(e) => setCommForm((p) => ({ ...p, type: e.target.value }))}>
                {["Email", "SMS", "Phone Call", "Internal Note"].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="To"><Input value={commForm.toName} onChange={(e) => setCommForm((p) => ({ ...p, toName: e.target.value }))} /></Field>
          </div>
          {commForm.type === "Email" && (
            <Field label="Subject"><Input value={commForm.subject} onChange={(e) => setCommForm((p) => ({ ...p, subject: e.target.value }))} /></Field>
          )}
          <Field label="Message"><Textarea value={commForm.body} onChange={(e) => setCommForm((p) => ({ ...p, body: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setCommOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!commForm.body.trim()}
              onClick={() => {
                addComm({ type: commForm.type as "Email" | "SMS" | "Phone Call" | "Internal Note", direction: commForm.type === "Internal Note" ? "Internal" : "Outbound", toName: commForm.toName, subject: commForm.subject || undefined, body: commForm.body, matterId: m.id, clientId: m.clientId });
                setCommOpen(false);
                pushToast("Communication logged");
              }}
            >Log</button>
          </div>
        </div>
      </Modal>

      <Modal open={docOpen} onClose={() => setDocOpen(false)} title="Upload Document">
        <div className="space-y-3">
          <label className="neu-inset flex cursor-pointer flex-col items-center gap-2 rounded-xl p-6 text-center transition-shadow hover:shadow-neu-sm">
            <Icon name="upload" size={22} className="text-accent" />
            <span className="text-xs font-bold text-ink">{docForm.name || "Choose a file"}</span>
            <span className="text-[10px] text-faint">Click to browse — the file name and size are captured automatically</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const ext = file.name.split(".").pop() ?? "pdf";
                  setDocForm({ name: file.name, ext });
                }
              }}
            />
          </label>
          <Field label="Document name"><Input value={docForm.name} onChange={(e) => setDocForm((p) => ({ ...p, name: e.target.value, ext: e.target.value.split(".").pop() ?? p.ext }))} /></Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setDocOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!docForm.name.trim()}
              onClick={() => {
                addDoc({ name: docForm.name, folder: `${m.number} ${client?.name.split(" ")[0] ?? ""}`.trim(), matterId: m.id, clientId: m.clientId, sizeKb: 40 + Math.round(Math.random() * 1200), ext: docForm.ext });
                setDocOpen(false);
                pushToast("Document uploaded to matter folder");
              }}
            >Upload</button>
          </div>
        </div>
      </Modal>

      <Modal open={renDoc !== null} onClose={() => setRenDoc(null)} title="Rename Document">
        <Field label="Name"><Input value={renDoc?.name ?? ""} onChange={(e) => setRenDoc((p) => (p ? { ...p, name: e.target.value } : p))} /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={() => setRenDoc(null)}>Cancel</button>
          <button className="btn-primary" disabled={!renDoc?.name.trim()} onClick={() => { if (renDoc) { updateDoc(renDoc.id, { name: renDoc.name }); pushToast("Document renamed"); } setRenDoc(null); }}>Save</button>
        </div>
      </Modal>

      <Modal open={verDoc !== null} onClose={() => setVerDoc(null)} title="Upload New Version">
        <Field label="Version note"><Input value={verNote} onChange={(e) => setVerNote(e.target.value)} placeholder="What changed?" /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={() => setVerDoc(null)}>Cancel</button>
          <button className="btn-primary" onClick={() => { if (verDoc) { addDocVersion(verDoc, verNote || undefined); pushToast("New version added"); } setVerDoc(null); }}>Add version</button>
        </div>
      </Modal>

      <ConfirmModal
        open={delDoc !== null}
        onClose={() => setDelDoc(null)}
        onConfirm={() => { if (delDoc) { deleteDoc(delDoc); pushToast("Document deleted"); } }}
        title="Delete document"
        body="This permanently removes the document and its version history. This action is recorded in the audit log."
        confirmLabel="Delete"
        danger
      />

      <Modal open={timeOpen} onClose={() => setTimeOpen(false)} title="Log Time">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date"><Input type="date" value={timeForm.date} onChange={(e) => setTimeForm((p) => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Hours"><Input type="number" step="0.1" min="0" value={timeForm.hours} onChange={(e) => setTimeForm((p) => ({ ...p, hours: parseFloat(e.target.value) || 0 }))} /></Field>
            <Field label="Rate ($/hr)"><Input type="number" min="0" value={timeForm.rate} onChange={(e) => setTimeForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} /></Field>
          </div>
          <Field label="Description"><Textarea value={timeForm.description} onChange={(e) => setTimeForm((p) => ({ ...p, description: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setTimeOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!timeForm.description.trim() || timeForm.hours <= 0}
              onClick={() => {
                addTimeEntry({ matterId: m.id, date: timeForm.date, hours: timeForm.hours, rate: timeForm.rate, description: timeForm.description, billable: true });
                setTimeOpen(false);
                setTimeForm((p) => ({ ...p, description: "", hours: 1 }));
                pushToast(`Logged — ${fmtMoney(timeForm.hours * timeForm.rate)}`);
              }}
            >Log time</button>
          </div>
        </div>
      </Modal>

      <Modal open={expOpen} onClose={() => setExpOpen(false)} title="Add Expense">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" value={expForm.date} onChange={(e) => setExpForm((p) => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Amount ($)"><Input type="number" min="0" value={expForm.amount || ""} onChange={(e) => setExpForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} /></Field>
          </div>
          <Field label="Category">
            <Select value={expForm.category} onChange={(e) => setExpForm((p) => ({ ...p, category: e.target.value }))}>
              {["Filing Fee", "Medical Records", "Service of Process", "Mediation", "Translation", "Records Request", "Expert Witness", "Travel", "Other"].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Description"><Input value={expForm.description} onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))} /></Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setExpOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!expForm.description.trim() || expForm.amount <= 0}
              onClick={() => {
                addExpense({ matterId: m.id, date: expForm.date, amount: expForm.amount, category: expForm.category, description: expForm.description, billable: true });
                setExpOpen(false);
                setExpForm((p) => ({ ...p, description: "", amount: 0 }));
                pushToast("Expense added");
              }}
            >Add expense</button>
          </div>
        </div>
      </Modal>

      <Modal open={invOpen} onClose={() => setInvOpen(false)} title="New Invoice" wide>
        <div className="space-y-3">
          <Field label="Line items">
            <div className="space-y-2">
              {invForm.items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Description" value={it.desc} onChange={(e) => setInvForm((p) => ({ ...p, items: p.items.map((x, xi) => (xi === i ? { ...x, desc: e.target.value } : x)) }))} />
                  <Input type="number" min="0" placeholder="0" className="w-28" value={it.amount || ""} onChange={(e) => setInvForm((p) => ({ ...p, items: p.items.map((x, xi) => (xi === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x)) }))} />
                  <button className="icon-btn shrink-0" onClick={() => setInvForm((p) => ({ ...p, items: p.items.filter((_, xi) => xi !== i) }))} disabled={invForm.items.length === 1}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
              <button className="btn-sm" onClick={() => setInvForm((p) => ({ ...p, items: [...p.items, { desc: "", amount: 0 }] }))}>
                <Icon name="plus" size={13} /> Add line
              </button>
            </div>
          </Field>
          <Field label="Due in (days)"><Input type="number" min="1" value={invForm.dueInDays} onChange={(e) => setInvForm((p) => ({ ...p, dueInDays: parseInt(e.target.value) || 14 }))} /></Field>
          <div className="neu-inset-sm flex items-center justify-between rounded-xl p-3 text-sm font-bold">
            <span>Total</span>
            <span>{fmtMoney(invForm.items.reduce((s, i) => s + i.amount, 0))}</span>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setInvOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={invForm.items.every((i) => !i.desc.trim() || i.amount <= 0)}
              onClick={() => {
                addInvoice({ clientId: m.clientId, matterId: m.id, items: invForm.items.filter((i) => i.desc.trim() && i.amount > 0), dueInDays: invForm.dueInDays });
                setInvOpen(false);
                pushToast("Invoice issued");
              }}
            >Issue invoice</button>
          </div>
        </div>
      </Modal>

      <Modal open={payInv !== null} onClose={() => setPayInv(null)} title="Record Payment">
        <div className="space-y-3">
          <Field label="Amount ($)"><Input type="number" min="0" value={payForm.amount || ""} onChange={(e) => setPayForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} /></Field>
          <Field label="Method">
            <Select value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}>
              {["Card", "ACH", "Check", "Wire"].map((m2) => <option key={m2}>{m2}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setPayInv(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={payForm.amount <= 0}
              onClick={() => {
                if (payInv) recordPayment(payInv, payForm.amount, payForm.method as "Card" | "ACH" | "Check" | "Wire");
                setPayInv(null);
                pushToast("Payment recorded");
              }}
            >Record</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
