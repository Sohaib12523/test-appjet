"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Avatar, Badge, Card, ConfirmModal, Drawer, Empty, Field, Icon, Input,
  Kebab, Modal, SearchInput, Segmented, Select, Tabs, Textarea, Timeline,
} from "@/components/neu";
import {
  COMM_TYPES, LEAD_SOURCES, LEAD_STATUSES, Lead, LeadStatus, PRACTICE_AREAS,
  PRIORITIES, Priority,
} from "@/lib/types";
import {
  LEAD_STATUS_TONE, PRIORITY_TONE, cn, fmtDate, fmtDateShort, fmtDateTime,
  fmtMoney, isPastDate, timeAgo, todayISO,
} from "@/lib/utils";
import { PageHead, downloadDemo, fmtKb, useLookups } from "./common";
import { navigate } from "@/lib/nav";

const KANBAN_COLS: LeadStatus[] = [
  "New Lead", "Contacted", "Qualified", "Consultation Scheduled",
  "Consultation Completed", "Retainer Sent", "Retainer Signed", "Converted", "Lost",
];

export default function LeadsView({ focusId }: { focusId?: string | null }) {
  const { db, can, addLead, updateLead, setLeadStatus, convertLead, pushToast } =
    useStore();
  const lk = useLookups();

  const [mode, setMode] = useState<"table" | "kanban">("table");
  const [q, setQ] = useState("");
  const [fPA, setFPA] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [fAttorney, setFAttorney] = useState("All");
  const [fPriority, setFPriority] = useState("All");
  const [fSource, setFSource] = useState("All");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [editLead, setEditLead] = useState<Lead | "new" | null>(null);
  const [confirmConvert, setConfirmConvert] = useState<string | null>(null);

  useEffect(() => {
    if (focusId && db.leads.some((l) => l.id === focusId)) setDrawerId(focusId);
  }, [focusId, db.leads]);

  const attorneys = db.users.filter((u) => u.role === "attorney" || u.role === "super_admin");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return db.leads.filter((l) => {
      if (fPA !== "All" && l.practiceArea !== fPA) return false;
      if (fStatus !== "All" && l.status !== fStatus) return false;
      if (fAttorney !== "All" && l.assignedAttorneyId !== fAttorney) return false;
      if (fPriority !== "All" && l.priority !== fPriority) return false;
      if (fSource !== "All" && l.source !== fSource) return false;
      if (query) {
        const hay = `${l.firstName} ${l.lastName} ${l.email} ${l.phone} ${l.caseType}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [db.leads, q, fPA, fStatus, fAttorney, fPriority, fSource]);

  const pipelineValue = filtered
    .filter((l) => l.status !== "Converted" && l.status !== "Lost")
    .reduce((s, l) => s + l.estimatedValue, 0);

  const doConvert = (id: string) => {
    const res = convertLead(id);
    if (res) {
      pushToast("Lead converted — client and matter created");
      setDrawerId(null);
      navigate("matters", res.matterId);
    } else {
      pushToast("Lead is already converted", "err");
    }
  };

  const move = (l: Lead, dir: 1 | -1) => {
    const i = KANBAN_COLS.indexOf(l.status);
    const next = KANBAN_COLS[Math.min(Math.max(i + dir, 0), KANBAN_COLS.length - 1)];
    if (next !== l.status) {
      setLeadStatus(l.id, next);
      pushToast(`Moved to "${next}"`);
    }
  };

  return (
    <div>
      <PageHead
        title="Leads"
        sub={`${filtered.length} leads · ${fmtMoney(pipelineValue)} in open pipeline`}
        actions={
          <>
            <Segmented
              options={[
                { value: "table", label: "Table", icon: "table" },
                { value: "kanban", label: "Pipeline", icon: "kanban" },
              ]}
              value={mode}
              onChange={setMode}
            />
            {can("leads.edit") && (
              <button className="btn-primary" onClick={() => setEditLead("new")}>
                <Icon name="plus" size={16} /> New Lead
              </button>
            )}
          </>
        }
      />

      {/* Filters */}
      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone, case type…" className="w-full sm:w-64" />
        <Select value={fPA} onChange={(e) => setFPA(e.target.value)} className="w-40">
          <option>All</option>
          {PRACTICE_AREAS.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="w-44">
          <option>All</option>
          {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={fAttorney} onChange={(e) => setFAttorney(e.target.value)} className="w-44">
          <option value="All">All attorneys</option>
          {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className="w-32">
          <option>All</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Select value={fSource} onChange={(e) => setFSource(e.target.value)} className="w-40">
          <option>All</option>
          {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        {(q || fPA !== "All" || fStatus !== "All" || fAttorney !== "All" || fPriority !== "All" || fSource !== "All") && (
          <button
            className="btn-sm"
            onClick={() => { setQ(""); setFPA("All"); setFStatus("All"); setFAttorney("All"); setFPriority("All"); setFSource("All"); }}
          >
            <Icon name="x" size={13} /> Clear
          </button>
        )}
      </Card>

      {mode === "table" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-[#c6ccd866]">
                <tr>
                  <th className="th">Lead</th>
                  <th className="th">Contact</th>
                  <th className="th">Practice Area</th>
                  <th className="th">Source</th>
                  <th className="th">Attorney</th>
                  <th className="th">Status</th>
                  <th className="th">Priority</th>
                  <th className="th text-right">Est. Value</th>
                  <th className="th">Follow-up</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="tr cursor-pointer border-b border-[#c6ccd833] last:border-0" onClick={() => setDrawerId(l.id)}>
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={`${l.firstName} ${l.lastName}`} size={32} />
                        <div>
                          <div className="font-bold">{l.firstName} {l.lastName}</div>
                          <div className="text-[11px] text-faint">{l.caseType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <div className="text-xs">{l.email}</div>
                      <div className="text-[11px] text-faint">{l.phone}</div>
                    </td>
                    <td className="td text-xs font-semibold">{l.practiceArea}</td>
                    <td className="td text-xs text-sub">{l.source}</td>
                    <td className="td">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Avatar name={lk.userName(l.assignedAttorneyId)} size={22} />
                        <span className="hidden xl:inline">{lk.userName(l.assignedAttorneyId)}</span>
                      </div>
                    </td>
                    <td className="td"><Badge tone={LEAD_STATUS_TONE[l.status]}>{l.status}</Badge></td>
                    <td className="td"><Badge tone={PRIORITY_TONE[l.priority]}>{l.priority}</Badge></td>
                    <td className="td text-right font-bold">{fmtMoney(l.estimatedValue)}</td>
                    <td className="td">
                      {l.nextFollowUpAt && l.status !== "Converted" && l.status !== "Lost" ? (
                        <span className={cn("text-xs font-bold", isPastDate(l.nextFollowUpAt) || l.nextFollowUpAt === todayISO() ? "text-bad" : "text-sub")}>
                          {fmtDateShort(l.nextFollowUpAt)}
                        </span>
                      ) : <span className="text-xs text-faint">—</span>}
                    </td>
                    <td className="td">
                      <Kebab items={[
                        { label: "Open", icon: "eye", onClick: () => setDrawerId(l.id) },
                        ...(can("leads.edit") ? [{ label: "Edit", icon: "pencil", onClick: () => setEditLead(l) }] : []),
                        ...(l.status !== "Converted" && l.status !== "Lost" && can("clients.view")
                          ? [{ label: "Convert to client", icon: "user-check", onClick: () => setConfirmConvert(l.id) }]
                          : []),
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <Empty icon="users" title="No leads match" hint="Adjust filters or add a new lead." />
            )}
          </div>
        </Card>
      ) : (
        /* Kanban */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLS.map((status) => {
            const col = filtered.filter((l) => l.status === status);
            const val = col.reduce((s, l) => s + l.estimatedValue, 0);
            return (
              <div key={status} className="w-72 shrink-0">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: { accent: "#2f6bff", viol: "#7a5af8", ink: "#1f2a44", warn: "#c9862b", ok: "#2f9e77", bad: "#d05555", neutral: "#8b97b5" }[LEAD_STATUS_TONE[status]] }} />
                    <span className="text-xs font-bold text-ink">{status}</span>
                    <span className="rounded-full bg-base px-2 py-0.5 text-[10px] font-bold text-faint shadow-neu-xs">{col.length}</span>
                  </div>
                  <span className="text-[10px] font-bold text-faint">{fmtMoney(val)}</span>
                </div>
                <div className="neu-inset min-h-[220px] space-y-3 rounded-2xl p-2.5">
                  {col.map((l) => (
                    <Card key={l.id} onClick={() => setDrawerId(l.id)} className="p-3">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-bold text-ink">{l.firstName} {l.lastName}</div>
                          <div className="truncate text-[11px] text-faint">{l.caseType} · {l.practiceArea}</div>
                        </div>
                        <Badge tone={PRIORITY_TONE[l.priority]}>{l.priority}</Badge>
                      </div>
                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-sub">
                        <span>{fmtMoney(l.estimatedValue)}</span>
                        <span className="text-faint">{l.source}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Avatar name={lk.userName(l.assignedAttorneyId)} size={22} />
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button className="icon-btn h-7 w-7" disabled={status === "New Lead"} onClick={() => move(l, -1)} title="Move back">
                            <Icon name="chevron-left" size={13} />
                          </button>
                          <button className="icon-btn h-7 w-7" disabled={status === "Lost"} onClick={() => move(l, 1)} title="Move forward">
                            <Icon name="chevron-right" size={13} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {col.length === 0 && (
                    <div className="py-8 text-center text-[11px] font-semibold text-faint">No leads</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead drawer */}
      <LeadDrawer
        leadId={drawerId}
        onClose={() => setDrawerId(null)}
        onEdit={(l) => { setDrawerId(null); setEditLead(l); }}
        onConvert={(id) => setConfirmConvert(id)}
      />

      {/* Create / edit */}
      {(editLead !== null) && (
        <LeadFormModal
          lead={editLead === "new" ? null : editLead}
          attorneys={attorneys.map((a) => ({ id: a.id, name: a.name }))}
          onClose={() => setEditLead(null)}
          onSave={(vals) => {
            if (editLead === "new") {
              addLead(vals);
              pushToast("Lead created — automations fired");
            } else {
              updateLead(editLead.id, vals);
              pushToast("Lead updated");
            }
            setEditLead(null);
          }}
        />
      )}

      <ConfirmModal
        open={confirmConvert !== null}
        onClose={() => setConfirmConvert(null)}
        onConfirm={() => confirmConvert && doConvert(confirmConvert)}
        title="Convert lead to client"
        body="This creates a client record, opens a new matter with the intake details carried over, and provisions a client portal account."
        confirmLabel="Convert"
      />
    </div>
  );
}

/* ================= Lead form modal ================= */

function LeadFormModal({
  lead, attorneys, onClose, onSave,
}: {
  lead: Lead | null;
  attorneys: { id: string; name: string }[];
  onClose: () => void;
  onSave: (v: Omit<Lead, "id" | "createdAt" | "lastContactAt" | "status">) => void;
}) {
  const [f, setF] = useState({
    firstName: lead?.firstName ?? "",
    lastName: lead?.lastName ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    practiceArea: lead?.practiceArea ?? PRACTICE_AREAS[0],
    caseType: lead?.caseType ?? "",
    description: lead?.description ?? "",
    source: lead?.source ?? LEAD_SOURCES[0],
    assignedAttorneyId: lead?.assignedAttorneyId ?? attorneys[0]?.id ?? "",
    priority: lead?.priority ?? ("Medium" as Priority),
    estimatedValue: lead?.estimatedValue ?? 0,
    nextFollowUpAt: lead?.nextFollowUpAt ?? "",
    lostReason: lead?.lostReason ?? "",
  });
  const set = (k: string, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.firstName.trim() && f.lastName.trim() && f.email.trim() && f.caseType.trim();

  return (
    <Modal open onClose={onClose} title={lead ? "Edit Lead" : "New Lead"} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name"><Input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
        <Field label="Last name"><Input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(404) 555-0100" /></Field>
        <Field label="Practice area">
          <Select value={f.practiceArea} onChange={(e) => set("practiceArea", e.target.value)}>
            {PRACTICE_AREAS.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Case type"><Input value={f.caseType} onChange={(e) => set("caseType", e.target.value)} placeholder="e.g. Auto Accident" /></Field>
        <Field label="Lead source">
          <Select value={f.source} onChange={(e) => set("source", e.target.value)}>
            {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Assigned attorney">
          <Select value={f.assignedAttorneyId} onChange={(e) => set("assignedAttorneyId", e.target.value)}>
            {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={f.priority} onChange={(e) => set("priority", e.target.value)}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Estimated value ($)">
          <Input type="number" min={0} value={f.estimatedValue || ""} onChange={(e) => set("estimatedValue", parseFloat(e.target.value) || 0)} />
        </Field>
        <Field label="Next follow-up">
          <Input type="date" value={f.nextFollowUpAt} onChange={(e) => set("nextFollowUpAt", e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Case description">
            <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief summary of the legal matter…" />
          </Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          disabled={!valid}
          onClick={() =>
            onSave({
              ...f,
              practiceArea: f.practiceArea as Lead["practiceArea"],
              source: f.source as Lead["source"],
              priority: f.priority as Priority,
              nextFollowUpAt: f.nextFollowUpAt || undefined,
              lostReason: f.lostReason || undefined,
            })
          }
        >
          {lead ? "Save changes" : "Create lead"}
        </button>
      </div>
    </Modal>
  );
}

/* ================= Lead detail drawer ================= */

type LeadTab = "overview" | "comms" | "notes" | "tasks" | "appts" | "docs" | "activity";

export function LeadDrawer({
  leadId, onClose, onEdit, onConvert,
}: {
  leadId: string | null;
  onClose: () => void;
  onEdit: (l: Lead) => void;
  onConvert: (id: string) => void;
}) {
  const {
    db, user, can, setLeadStatus, updateLead, addComm, addNote, addTask,
    addAppointment, addDoc, addRetainer, pushToast,
  } = useStore();
  const lk = useLookups();
  const [tab, setTab] = useState<LeadTab>("overview");
  const [commForm, setCommForm] = useState({ type: "Email", subject: "", body: "" });
  const [noteText, setNoteText] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: todayISO(), priority: "Medium" });
  const [apptForm, setApptForm] = useState({ title: "", type: "Consultation", date: todayISO(), startTime: "10:00", endTime: "10:45", location: "" });
  const [docName, setDocName] = useState("");
  const [retOpen, setRetOpen] = useState(false);
  const [retForm, setRetForm] = useState({ title: "", amount: 0, feeStructure: "" });

  const lead = db.leads.find((l) => l.id === leadId) ?? null;

  useEffect(() => {
    setTab("overview");
    setRetOpen(false);
  }, [leadId]);

  if (!lead) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;

  const name = `${lead.firstName} ${lead.lastName}`;
  const comms = db.communications.filter((c) => c.leadId === lead.id);
  const notes = db.notes.filter((n) => n.leadId === lead.id);
  const tasks = db.tasks.filter((t) => t.leadId === lead.id);
  const appts = db.appointments.filter((a) => a.leadId === lead.id).sort((a, b) => a.date.localeCompare(b.date));
  const docs = db.documents.filter((d2) => d2.leadId === lead.id);
  const acts = db.activities.filter((a) => a.leadId === lead.id);
  const rets = db.retainers.filter((r) => r.leadId === lead.id);

  const tabBtn = "w-full";

  return (
    <Drawer
      open
      onClose={onClose}
      width={620}
      title={
        <div className="flex items-center gap-3">
          <Avatar name={name} size={38} />
          <div className="min-w-0">
            <div className="truncate">{name}</div>
            <div className="mt-0.5 flex flex-wrap gap-1.5">
              <Badge tone={LEAD_STATUS_TONE[lead.status]}>{lead.status}</Badge>
              <Badge tone={PRIORITY_TONE[lead.priority]}>{lead.priority}</Badge>
            </div>
          </div>
        </div>
      }
    >
      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {lead.status !== "Converted" && lead.status !== "Lost" && can("clients.view") && (
          <button className="btn-primary" onClick={() => onConvert(lead.id)}>
            <Icon name="user-check" size={15} /> Convert to Client
          </button>
        )}
        {lead.status !== "Converted" && lead.status !== "Lost" && can("retainers.manage") && (
          <button className="btn" onClick={() => { setRetForm({ title: `Retainer Agreement — ${lead.caseType}`, amount: 0, feeStructure: "" }); setRetOpen(true); }}>
            <Icon name="sign" size={15} /> Create Retainer
          </button>
        )}
        {can("leads.edit") && (
          <button className="btn" onClick={() => onEdit(lead)}>
            <Icon name="pencil" size={15} /> Edit
          </button>
        )}
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => setTab(v as LeadTab)}
        options={[
          { value: "overview", label: "Overview" },
          { value: "comms", label: `Comms (${comms.length})` },
          { value: "notes", label: `Notes (${notes.length})` },
          { value: "tasks", label: `Tasks (${tasks.length})` },
          { value: "appts", label: `Appts (${appts.length})` },
          { value: "docs", label: `Docs (${docs.length})` },
          { value: "activity", label: "Activity" },
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="neu-inset rounded-xl p-4 text-[13px] leading-relaxed text-sub">
            {lead.description || "No case description yet."}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Email", lead.email, "mail"],
              ["Phone", lead.phone, "phone"],
              ["Source", lead.source, "globe"],
              ["Practice area", lead.practiceArea, "scales"],
              ["Attorney", lk.userName(lead.assignedAttorneyId), "user"],
              ["Intake manager", lead.intakeManagerId ? lk.userName(lead.intakeManagerId) : "—", "clipboard"],
              ["Estimated value", fmtMoney(lead.estimatedValue), "money"],
              ["Created", fmtDate(lead.createdAt), "calendar"],
              ["Last contact", timeAgo(lead.lastContactAt), "clock"],
              ["Next follow-up", lead.nextFollowUpAt ? fmtDate(lead.nextFollowUpAt) : "—", "bell"],
            ].map(([k, v, ic]) => (
              <div key={k as string} className="neu-inset-sm rounded-xl p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-faint">
                  <Icon name={ic as string} size={11} /> {k}
                </div>
                <div className="truncate text-xs font-bold text-ink">{v}</div>
              </div>
            ))}
          </div>

          {can("leads.edit") && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lead status">
                <Select value={lead.status} onChange={(e) => setLeadStatus(lead.id, e.target.value as LeadStatus)}>
                  {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Next follow-up">
                <Input type="date" value={lead.nextFollowUpAt ?? ""} onChange={(e) => updateLead(lead.id, { nextFollowUpAt: e.target.value || undefined })} />
              </Field>
              {lead.status === "Lost" && (
                <div className="col-span-2">
                  <Field label="Lost reason">
                    <Input
                      defaultValue={lead.lostReason ?? ""}
                      placeholder="Why was this lead lost?"
                      onBlur={(e) => updateLead(lead.id, { lostReason: e.target.value })}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {rets.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Retainers</div>
              <div className="space-y-2">
                {rets.map((r) => (
                  <button key={r.id} onClick={() => navigate("retainers")} className="neu-inset-sm flex w-full items-center justify-between rounded-xl p-3 text-left">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-ink">{r.title}</div>
                      <div className="text-[10px] text-faint">{fmtMoney(r.amount)} · {r.feeStructure}</div>
                    </div>
                    <Badge tone={r.status === "Signed" ? "ok" : "warn"}>{r.status}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "comms" && (
        <div className="space-y-4">
          <div className="neu-inset rounded-xl p-3">
            <div className="mb-2 flex gap-2">
              <Select value={commForm.type} onChange={(e) => setCommForm((p) => ({ ...p, type: e.target.value }))} className="w-36">
                {COMM_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
              {commForm.type === "Email" && (
                <Input placeholder="Subject" value={commForm.subject} onChange={(e) => setCommForm((p) => ({ ...p, subject: e.target.value }))} />
              )}
            </div>
            <Textarea placeholder={`Log a ${commForm.type.toLowerCase()} with ${lead.firstName}…`} value={commForm.body} onChange={(e) => setCommForm((p) => ({ ...p, body: e.target.value }))} />
            <div className="mt-2 flex justify-end">
              <button
                className="btn-primary"
                disabled={!commForm.body.trim()}
                onClick={() => {
                  addComm({
                    type: commForm.type as (typeof COMM_TYPES)[number],
                    direction: commForm.type === "Internal Note" ? "Internal" : "Outbound",
                    toName: name,
                    subject: commForm.subject || undefined,
                    body: commForm.body,
                    leadId: lead.id,
                  });
                  setCommForm({ type: "Email", subject: "", body: "" });
                  pushToast("Communication logged");
                }}
              >
                <Icon name="send" size={14} /> Log
              </button>
            </div>
          </div>
          {comms.length === 0 && <Empty icon="message" title="No communications yet" />}
          {comms.map((c) => (
            <div key={c.id} className="neu-inset-sm rounded-xl p-3.5">
              <div className="mb-1 flex items-center justify-between gap-2">
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
      )}

      {tab === "notes" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Add a private note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <button
              className="btn-primary shrink-0"
              disabled={!noteText.trim()}
              onClick={() => { addNote(noteText, { leadId: lead.id }); setNoteText(""); pushToast("Note added"); }}
            >
              <Icon name="plus" size={15} />
            </button>
          </div>
          {notes.length === 0 && <Empty icon="note" title="No notes yet" />}
          {notes.map((n) => (
            <div key={n.id} className="neu-inset-sm rounded-xl p-3.5">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-sub">{n.body}</p>
              <div className="tiny mt-2">{lk.userName(n.authorId)} · {timeAgo(n.at)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-3">
          <div className="neu-inset grid gap-2 rounded-xl p-3 sm:grid-cols-[1fr_130px_110px_auto]">
            <Input placeholder="Task title…" value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} />
            <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))} />
            <Select value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
            <button
              className={cn("btn-primary", tabBtn)}
              disabled={!taskForm.title.trim()}
              onClick={() => {
                addTask({
                  title: taskForm.title,
                  assigneeId: user?.id ?? lead.assignedAttorneyId,
                  leadId: lead.id,
                  priority: taskForm.priority as Priority,
                  dueDate: taskForm.dueDate,
                });
                setTaskForm({ title: "", dueDate: todayISO(), priority: "Medium" });
                pushToast("Task created");
              }}
            >
              <Icon name="plus" size={15} /> Add
            </button>
          </div>
          {tasks.length === 0 && <Empty icon="check-square" title="No tasks for this lead" />}
          {tasks.map((t) => (
            <div key={t.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
              <div className="min-w-0 flex-1">
                <div className={cn("text-xs font-bold text-ink", t.status === "Completed" && "line-through opacity-60")}>{t.title}</div>
                <div className="text-[10px] font-semibold text-faint">{lk.userName(t.assigneeId)} · due {fmtDateShort(t.dueDate)}</div>
              </div>
              <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
              <Badge tone={t.status === "Completed" ? "ok" : isPastDate(t.dueDate) ? "bad" : "accent"}>
                {t.status === "Completed" ? "Completed" : isPastDate(t.dueDate) ? "Overdue" : t.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {tab === "appts" && (
        <div className="space-y-3">
          <div className="neu-inset grid gap-2 rounded-xl p-3 sm:grid-cols-2">
            <Input placeholder="Appointment title" value={apptForm.title} onChange={(e) => setApptForm((p) => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
            <Select value={apptForm.type} onChange={(e) => setApptForm((p) => ({ ...p, type: e.target.value }))}>
              {["Consultation", "Client Meeting", "Follow-up", "Court Hearing", "Deposition", "Filing Deadline", "Internal Meeting"].map((t) => <option key={t}>{t}</option>)}
            </Select>
            <Input type="date" value={apptForm.date} onChange={(e) => setApptForm((p) => ({ ...p, date: e.target.value }))} />
            <Input type="time" value={apptForm.startTime} onChange={(e) => setApptForm((p) => ({ ...p, startTime: e.target.value }))} />
            <Input type="time" value={apptForm.endTime} onChange={(e) => setApptForm((p) => ({ ...p, endTime: e.target.value }))} />
            <Input placeholder="Location (office, video, phone)" value={apptForm.location} onChange={(e) => setApptForm((p) => ({ ...p, location: e.target.value }))} className="sm:col-span-2" />
            <button
              className="btn-primary sm:col-span-2"
              disabled={!apptForm.title.trim()}
              onClick={() => {
                addAppointment({
                  title: apptForm.title,
                  type: apptForm.type as (typeof import("@/lib/types").EVENT_TYPES)[number],
                  date: apptForm.date,
                  startTime: apptForm.startTime,
                  endTime: apptForm.endTime,
                  leadId: lead.id,
                  attendeeIds: [user?.id ?? lead.assignedAttorneyId],
                  location: apptForm.location || undefined,
                });
                pushToast("Appointment scheduled");
              }}
            >
              <Icon name="calendar" size={15} /> Schedule
            </button>
          </div>
          {appts.length === 0 && <Empty icon="calendar" title="No appointments" />}
          {appts.map((a) => (
            <div key={a.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
              <span className="timeline-dot text-accent"><Icon name="calendar" size={14} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-ink">{a.title}</div>
                <div className="text-[10px] font-semibold text-faint">
                  {fmtDate(a.date)} · {a.startTime}–{a.endTime}{a.location ? ` · ${a.location}` : ""}
                </div>
              </div>
              <Badge tone="accent">{a.type}</Badge>
            </div>
          ))}
        </div>
      )}

      {tab === "docs" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Document name, e.g. Police Report.pdf" value={docName} onChange={(e) => setDocName(e.target.value)} />
            <button
              className="btn-primary shrink-0"
              disabled={!docName.trim()}
              onClick={() => {
                const ext = docName.split(".").pop() ?? "pdf";
                addDoc({ name: docName, folder: "Intake Forms", leadId: lead.id, sizeKb: 40 + Math.round(Math.random() * 800), ext });
                setDocName("");
                pushToast("Document uploaded");
              }}
            >
              <Icon name="upload" size={15} />
            </button>
          </div>
          {docs.length === 0 && <Empty icon="folder" title="No documents yet" hint="Upload intake forms, evidence and correspondence." />}
          {docs.map((d2) => (
            <div key={d2.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
              <span className="timeline-dot text-accent"><Icon name="file" size={14} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-ink">{d2.name}</div>
                <div className="text-[10px] font-semibold text-faint">{d2.folder} · {fmtKb(d2.sizeKb)} · v{d2.versions.length}</div>
              </div>
              <button className="icon-btn h-8 w-8" title="Download" onClick={() => downloadDemo(d2.name, d2.name)}>
                <Icon name="download" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "activity" && (
        <Timeline
          items={acts.map((a) => ({ id: a.id, at: a.at, icon: "dot", title: a.text, body: `by ${a.actor}` }))}
          renderTime={(iso) => fmtDateTime(iso)}
        />
      )}

      {/* Create retainer modal */}
      <Modal open={retOpen} onClose={() => setRetOpen(false)} title="Create Retainer">
        <div className="space-y-3">
          <Field label="Title"><Input value={retForm.title} onChange={(e) => setRetForm((p) => ({ ...p, title: e.target.value }))} /></Field>
          <Field label="Retainer amount ($)">
            <Input type="number" min={0} value={retForm.amount || ""} onChange={(e) => setRetForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
          </Field>
          <Field label="Fee structure">
            <Textarea value={retForm.feeStructure} onChange={(e) => setRetForm((p) => ({ ...p, feeStructure: e.target.value }))} placeholder="e.g. Hourly at $385/hr against $7,500 retainer, or 33⅓% contingency" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn" onClick={() => setRetOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!retForm.title.trim()}
              onClick={() => {
                addRetainer({ leadId: lead.id, ...retForm });
                setRetOpen(false);
                pushToast("Retainer created as draft");
              }}
            >
              <Icon name="sign" size={15} /> Create draft
            </button>
          </div>
        </div>
      </Modal>
    </Drawer>
  );
}
