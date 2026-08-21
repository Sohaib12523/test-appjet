"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Avatar, Badge, Card, Empty, Field, Icon, Input, Modal, SearchInput,
  Segmented, Select, Textarea, Toggle,
} from "@/components/neu";
import { PRIORITIES, Priority, TaskItem } from "@/lib/types";
import { PRIORITY_TONE, cn, fmtDateShort, isTodayISO } from "@/lib/utils";
import { PageHead, TASK_TONE, effectiveTaskStatus, useLookups } from "./common";
import { navigate } from "@/lib/nav";

export default function TasksView({ focusId }: { focusId?: string | null }) {
  const { db, user, addTask, updateTask, pushToast } = useStore();
  const lk = useLookups();
  const [fStatus, setFStatus] = useState<"All" | "To Do" | "In Progress" | "Overdue" | "Completed">("All");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TaskItem | null>(null);
  const [form, setForm] = useState({
    title: "", assigneeId: user?.id ?? "", matterId: "", leadId: "",
    priority: "Medium" as Priority, dueDate: new Date().toISOString().slice(0, 10),
    notes: "", reminder: false,
  });

  useEffect(() => {
    if (focusId) {
      const t = db.tasks.find((x) => x.id === focusId);
      if (t) setEdit(t);
    }
  }, [focusId, db.tasks]);

  const staff = db.users.filter((u) => u.role !== "client");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return db.tasks
      .filter((t) => {
        if (mine && t.assigneeId !== user?.id) return false;
        const eff = effectiveTaskStatus(t);
        if (fStatus !== "All" && eff !== fStatus) return false;
        if (query && !`${t.title} ${t.notes ?? ""}`.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.status === "Completed" && b.status !== "Completed") return 1;
        if (b.status === "Completed" && a.status !== "Completed") return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [db.tasks, mine, fStatus, q, user]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: 0, "To Do": 0, "In Progress": 0, Overdue: 0, Completed: 0 };
    db.tasks.forEach((t) => {
      if (mine && t.assigneeId !== user?.id) return;
      c.All++;
      c[effectiveTaskStatus(t)]++;
    });
    return c;
  }, [db.tasks, mine, user]);

  const ctx = (t: TaskItem) =>
    t.matterId
      ? { label: lk.matterName(t.matterId), view: "matters", id: t.matterId }
      : t.leadId
      ? { label: lk.leadName(t.leadId), view: "leads", id: t.leadId }
      : t.clientId
      ? { label: lk.clientName(t.clientId), view: "clients", id: t.clientId }
      : null;

  return (
    <div>
      <PageHead
        title="Tasks"
        sub={`${counts.Overdue} overdue · ${counts["To Do"] + counts["In Progress"]} open`}
        actions={
          <>
            <span className="flex items-center gap-2 text-xs font-bold text-sub">
              Mine only <Toggle on={mine} onChange={setMine} />
            </span>
            <button className="btn-primary" onClick={() => { setForm((p) => ({ ...p, assigneeId: user?.id ?? p.assigneeId })); setOpen(true); }}>
              <Icon name="plus" size={16} /> New Task
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          options={(["All", "To Do", "In Progress", "Overdue", "Completed"] as const).map((s) => ({
            value: s, label: `${s} (${counts[s]})`,
          }))}
          value={fStatus}
          onChange={setFStatus}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search tasks…" className="w-full sm:w-56" />
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-[#c6ccd833]">
          {filtered.map((t) => {
            const eff = effectiveTaskStatus(t);
            const c = ctx(t);
            return (
              <div key={t.id} className="tr flex items-center gap-3 p-3.5">
                <button
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all",
                    t.status === "Completed" ? "bg-ok text-white shadow-neu-xs" : "shadow-neu-in-sm hover:shadow-neu-in"
                  )}
                  onClick={() => {
                    updateTask(t.id, { status: t.status === "Completed" ? "To Do" : "Completed" });
                    pushToast(t.status === "Completed" ? "Task reopened" : "Task completed");
                  }}
                  title={t.status === "Completed" ? "Reopen" : "Complete"}
                >
                  {t.status === "Completed" && <Icon name="check" size={13} />}
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => setEdit(t)}
                    className={cn("block truncate text-left text-[13px] font-bold text-ink hover:text-accent", t.status === "Completed" && "line-through opacity-60")}
                  >
                    {t.title}
                  </button>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] font-semibold text-faint">
                    <span className="flex items-center gap-1">
                      <Avatar name={lk.userName(t.assigneeId)} size={14} />
                      {lk.userName(t.assigneeId)}
                    </span>
                    {c && (
                      <button onClick={() => navigate(c.view, c.id)} className="flex items-center gap-0.5 text-accent hover:underline">
                        <Icon name="arrow-right" size={9} /> {c.label}
                      </button>
                    )}
                    {t.reminderAt && <Icon name="bell" size={10} className="text-warn" />}
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className={cn("text-xs font-bold", eff === "Overdue" ? "text-bad" : isTodayISO(t.dueDate) ? "text-warn" : "text-sub")}>
                    {eff === "Overdue" ? "Overdue · " : ""}{fmtDateShort(t.dueDate)}
                  </div>
                  {isTodayISO(t.dueDate) && eff !== "Overdue" && <div className="text-[9px] font-bold uppercase text-warn">Due today</div>}
                </div>
                <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                <Badge tone={TASK_TONE[eff]}>{eff}</Badge>
              </div>
            );
          })}
          {filtered.length === 0 && <Empty icon="check-square" title="No tasks here" hint="Create a task or adjust filters." />}
        </div>
      </Card>

      {/* New task */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Task" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Task name"><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></Field>
          </div>
          <Field label="Assignee">
            <Select value={form.assigneeId} onChange={(e) => setForm((p) => ({ ...p, assigneeId: e.target.value }))}>
              {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} /></Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as Priority }))}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Reminder">
            <div className="neu-inset-sm flex h-[42px] items-center justify-between rounded-xl px-3">
              <span className="text-xs font-bold text-sub">Remind on due date</span>
              <Toggle on={form.reminder} onChange={(v) => setForm((p) => ({ ...p, reminder: v }))} />
            </div>
          </Field>
          <Field label="Linked matter">
            <Select value={form.matterId} onChange={(e) => setForm((p) => ({ ...p, matterId: e.target.value, leadId: "" }))}>
              <option value="">None</option>
              {db.matters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Or linked lead">
            <Select value={form.leadId} onChange={(e) => setForm((p) => ({ ...p, leadId: e.target.value, matterId: "" }))}>
              <option value="">None</option>
              {db.leads.filter((l) => l.status !== "Converted").map((l) => (
                <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>
              ))}
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
            disabled={!form.title.trim() || !form.assigneeId}
            onClick={() => {
              const matter = form.matterId ? lk.matter(form.matterId) : undefined;
              addTask({
                title: form.title, assigneeId: form.assigneeId,
                matterId: form.matterId || undefined,
                leadId: form.leadId || undefined,
                clientId: matter?.clientId,
                priority: form.priority, dueDate: form.dueDate,
                notes: form.notes || undefined,
                reminderAt: form.reminder ? form.dueDate : undefined,
              });
              setOpen(false);
              setForm((p) => ({ ...p, title: "", notes: "", matterId: "", leadId: "" }));
              pushToast("Task created and assignee notified");
            }}
          >Create task</button>
        </div>
      </Modal>

      {/* Edit task */}
      <Modal open={edit !== null} onClose={() => setEdit(null)} title="Task Details">
        {edit && (
          <div className="space-y-3">
            <Field label="Task name"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assignee">
                <Select value={edit.assigneeId} onChange={(e) => setEdit({ ...edit, assigneeId: e.target.value })}>
                  {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
              <Field label="Due date"><Input type="date" value={edit.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></Field>
              <Field label="Priority">
                <Select value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value as Priority })}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as TaskItem["status"] })}>
                  {["To Do", "In Progress", "Completed"].map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Notes"><Textarea value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => setEdit(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  updateTask(edit.id, {
                    title: edit.title, assigneeId: edit.assigneeId, dueDate: edit.dueDate,
                    priority: edit.priority, status: edit.status, notes: edit.notes,
                  });
                  setEdit(null);
                  pushToast("Task updated");
                }}
              >Save changes</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
