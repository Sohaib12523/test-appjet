"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge, Card, Field, Icon, Input, Modal, Toggle,
} from "@/components/neu";
import { PageHead } from "./common";

const TRIGGERS = [
  "When a new lead is created",
  "When a consultation is booked",
  "When a consultation is completed",
  "When a retainer is signed",
  "When a task becomes overdue",
];

const ACTION_TEMPLATES = [
  "Assign intake manager (Lena Kowalski)",
  "Send notification to intake team",
  "Create follow-up task due in 1 day",
  "Send confirmation email + SMS to lead",
  "Create reminder 24h before appointment",
  "Create follow-up task for assigned attorney",
  "Send engagement letter template",
  "Convert lead to client",
  "Create new matter (draft)",
  "Notify assigned attorney",
  "Notify assigned user",
  "Notify supervising attorney after 24h",
];

export default function AutomationsView() {
  const { db, can, toggleAutomation, addAutomation, pushToast } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: TRIGGERS[0], actions: [] as string[] });
  const canEdit = can("automations.edit");

  return (
    <div>
      <PageHead
        title="Automations"
        sub="Workflow rules that route leads, fire reminders and onboard clients — runs are recorded live"
        actions={
          canEdit ? (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Icon name="plus" size={16} /> New Rule
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 neu-inset flex items-start gap-3 rounded-2xl p-4 text-xs leading-relaxed text-sub">
        <Icon name="bolt" size={16} className="mt-0.5 shrink-0 text-warn" />
        <p>
          Rules fire on real actions inside the app — create a lead, book a
          consultation, sign a retainer or let a task go overdue and watch
          notifications, tasks and run counters update in real time.
          {!canEdit && " You have view-only access to automations."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {db.automations.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-neu-in-sm ${a.active ? "text-accent" : "text-faint"}`}>
                  <Icon name="bolt" size={20} />
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">{a.name}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-faint">{a.runs} runs</div>
                </div>
              </div>
              <Toggle on={a.active} onChange={() => toggleAutomation(a.id)} disabled={!canEdit} />
            </div>
            <div className="mb-2">
              <span className="chip text-viol">
                <Icon name="clock" size={11} /> {a.trigger}
              </span>
            </div>
            <div className="space-y-1.5">
              {a.actions.map((act) => (
                <div key={act} className="neu-inset-sm flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-sub">
                  <Icon name="arrow-right" size={11} className="shrink-0 text-accent" />
                  {act}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Badge tone={a.active ? "ok" : "neutral"}>{a.active ? "Active" : "Paused"}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Automation Rule" wide>
        <div className="space-y-4">
          <Field label="Rule name">
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Weekend lead triage" />
          </Field>
          <Field label="Trigger">
            <div className="grid gap-1.5">
              {TRIGGERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((p) => ({ ...p, trigger: t }))}
                  className={`rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all ${
                    form.trigger === t ? "text-accent shadow-neu-sm" : "text-sub shadow-neu-in-sm hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label={`Actions (${form.actions.length} selected)`}>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {ACTION_TEMPLATES.map((a) => {
                const on = form.actions.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        actions: on ? p.actions.filter((x) => x !== a) : [...p.actions, a],
                      }))
                    }
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition-all ${
                      on ? "text-accent shadow-neu-sm" : "text-sub shadow-neu-in-sm hover:text-ink"
                    }`}
                  >
                    <Icon name={on ? "check" : "plus"} size={12} />
                    {a}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!form.name.trim() || form.actions.length === 0}
              onClick={() => {
                addAutomation({ name: form.name, trigger: form.trigger, actions: form.actions });
                setOpen(false);
                setForm({ name: "", trigger: TRIGGERS[0], actions: [] });
                pushToast("Automation rule created and activated");
              }}
            >
              <Icon name="bolt" size={15} /> Activate rule
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
