"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge, Card, Empty, Field, Icon, Input, Modal, Select, Stat, Textarea,
} from "@/components/neu";
import { RETAINER_STATUSES, Retainer, RetainerStatus } from "@/lib/types";
import { fmtDateTime, fmtMoney, timeAgo } from "@/lib/utils";
import { PageHead, useLookups } from "./common";
import { navigate } from "@/lib/nav";

const STATUS_TONE: Record<RetainerStatus, "neutral" | "accent" | "viol" | "warn" | "ok"> = {
  Draft: "neutral",
  Sent: "accent",
  Viewed: "viol",
  "Pending Signature": "warn",
  Signed: "ok",
};

const FEE_PRESETS = [
  "Hourly against replenishing retainer",
  "Flat fee — milestone based",
  "Contingency (33⅓% pre-suit / 40% after filing)",
  "Hybrid: reduced hourly + contingency",
];

export default function RetainersView() {
  const { db, can, addRetainer, setRetainerStatus, convertLead, pushToast } = useStore();
  const lk = useLookups();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leadId: "", title: "", amount: 0, feeStructure: FEE_PRESETS[0] });

  const eligibleLeads = db.leads.filter((l) => l.status !== "Converted" && l.status !== "Lost");

  const kpis = useMemo(() => {
    const inPipe = db.retainers.filter((r) => r.status !== "Signed");
    const signed = db.retainers.filter((r) => r.status === "Signed");
    const month = new Date().getMonth();
    const signedMonth = signed.filter((r) => r.signedAt && new Date(r.signedAt).getMonth() === month);
    return {
      pipeline: inPipe.reduce((s, r) => s + r.amount, 0),
      pipelineCount: inPipe.length,
      signedMonth: signedMonth.length,
      rate: db.retainers.length ? Math.round((signed.length / db.retainers.length) * 100) : 0,
    };
  }, [db.retainers]);

  const nextAction = (r: Retainer): { label: string; icon: string; run: () => void } | null => {
    if (!can("retainers.manage")) return null;
    switch (r.status) {
      case "Draft":
        return { label: "Send for signature", icon: "send", run: () => { setRetainerStatus(r.id, "Sent"); pushToast("Retainer sent — client notified"); } };
      case "Sent":
        return { label: "Mark viewed", icon: "eye", run: () => { setRetainerStatus(r.id, "Viewed"); pushToast("Client opened the retainer"); } };
      case "Viewed":
        return { label: "Send reminder", icon: "bell", run: () => { setRetainerStatus(r.id, "Pending Signature"); pushToast("Reminder sent via email + SMS"); } };
      case "Pending Signature":
        return { label: "Simulate e-signature", icon: "sign", run: () => { setRetainerStatus(r.id, "Signed"); pushToast("Retainer signed — onboarding automation fired"); } };
      default:
        return null;
    }
  };

  return (
    <div>
      <PageHead
        title="Retainers & E-Signature"
        sub="Draft → send → track views → countersign → convert"
        actions={
          can("retainers.manage") ? (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Icon name="plus" size={16} /> New Retainer
            </button>
          ) : undefined
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="In signature pipeline" value={fmtMoney(kpis.pipeline)} icon="sign" tone="accent" delta={`${kpis.pipelineCount} open`} />
        <Stat label="Signed this month" value={kpis.signedMonth} icon="check" tone="ok" />
        <Stat label="Signature rate" value={`${kpis.rate}%`} icon="chart" tone="viol" delta="all time" />
        <Stat label="Total retainers" value={db.retainers.length} icon="folder" tone="ink" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {RETAINER_STATUSES.map((status) => {
          const col = db.retainers.filter((r) => r.status === status);
          return (
            <div key={status} className="w-80 shrink-0">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">{status}</span>
                  <span className="rounded-full bg-base px-2 py-0.5 text-[10px] font-bold text-faint shadow-neu-xs">{col.length}</span>
                </div>
                <span className="text-[10px] font-bold text-faint">{fmtMoney(col.reduce((s, r) => s + r.amount, 0))}</span>
              </div>
              <div className="neu-inset min-h-[200px] space-y-3 rounded-2xl p-2.5">
                {col.map((r) => {
                  const lead = lk.lead(r.leadId);
                  const action = nextAction(r);
                  return (
                    <Card key={r.id} className="p-3.5">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0 text-[13px] font-bold leading-tight text-ink">{r.title}</div>
                        <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                      </div>
                      <button
                        className="mb-2 block truncate text-[11px] font-bold text-accent hover:underline"
                        onClick={() => navigate("leads", r.leadId)}
                      >
                        {lead ? `${lead.firstName} ${lead.lastName}` : "—"} · {lead?.caseType}
                      </button>
                      <div className="mb-2 rounded-lg bg-base p-2 text-[11px] font-semibold text-sub shadow-neu-in-sm">
                        {r.amount > 0 ? fmtMoney(r.amount) : "Contingency"} — {r.feeStructure}
                      </div>
                      <div className="mb-3 grid grid-cols-2 gap-x-2 gap-y-1 text-[9.5px] font-semibold text-faint">
                        <span>Created {timeAgo(r.createdAt)}</span>
                        {r.sentAt && <span title={fmtDateTime(r.sentAt)}>Sent {timeAgo(r.sentAt)}</span>}
                        {r.viewedAt && <span title={fmtDateTime(r.viewedAt)}>Viewed {timeAgo(r.viewedAt)}</span>}
                        {r.signedAt && <span title={fmtDateTime(r.signedAt)}>Signed {timeAgo(r.signedAt)}</span>}
                      </div>
                      {action && (
                        <button className="btn-primary w-full" onClick={action.run}>
                          <Icon name={action.icon} size={14} /> {action.label}
                        </button>
                      )}
                      {r.status === "Signed" && lead && lead.status !== "Converted" && (
                        <button
                          className="btn w-full text-ok"
                          onClick={() => {
                            const res = convertLead(lead.id);
                            if (res) {
                              pushToast("Converted — client + matter created");
                              navigate("matters", res.matterId);
                            } else pushToast("Lead already converted", "err");
                          }}
                        >
                          <Icon name="user-check" size={14} /> Convert to client
                        </button>
                      )}
                      {r.status === "Signed" && lead?.status === "Converted" && (
                        <div className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-ok">
                          <Icon name="check" size={14} /> Converted to client
                        </div>
                      )}
                    </Card>
                  );
                })}
                {col.length === 0 && (
                  <div className="py-8 text-center text-[11px] font-semibold text-faint">No retainers</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Retainer">
        <div className="space-y-3">
          <Field label="Lead">
            <Select
              value={form.leadId}
              onChange={(e) => {
                const lead = lk.lead(e.target.value);
                setForm((p) => ({
                  ...p,
                  leadId: e.target.value,
                  title: lead ? `Retainer Agreement — ${lead.caseType}` : p.title,
                }));
              }}
            >
              <option value="">Select a lead…</option>
              {eligibleLeads.map((l) => (
                <option key={l.id} value={l.id}>{l.firstName} {l.lastName} — {l.caseType}</option>
              ))}
            </Select>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></Field>
          <Field label="Retainer amount ($) — 0 for contingency">
            <Input type="number" min="0" value={form.amount || ""} onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
          </Field>
          <Field label="Fee structure">
            <Select
              value={FEE_PRESETS.includes(form.feeStructure) ? form.feeStructure : "__custom"}
              onChange={(e) => {
                if (e.target.value !== "__custom") setForm((p) => ({ ...p, feeStructure: e.target.value }));
              }}
            >
              {FEE_PRESETS.map((p) => <option key={p}>{p}</option>)}
              <option value="__custom">Custom…</option>
            </Select>
          </Field>
          {!FEE_PRESETS.includes(form.feeStructure) && (
            <Field label="Custom fee terms">
              <Textarea value={form.feeStructure} onChange={(e) => setForm((p) => ({ ...p, feeStructure: e.target.value }))} />
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!form.leadId || !form.title.trim()}
              onClick={() => {
                addRetainer({ leadId: form.leadId, title: form.title, amount: form.amount, feeStructure: form.feeStructure });
                setOpen(false);
                setForm({ leadId: "", title: "", amount: 0, feeStructure: FEE_PRESETS[0] });
                pushToast("Retainer draft created");
              }}
            >
              <Icon name="sign" size={15} /> Create draft
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
