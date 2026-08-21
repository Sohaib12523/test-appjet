"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Avatar, Badge, Card, Empty, Field, Icon, Input, Modal, Segmented, Select, Textarea,
} from "@/components/neu";
import { Appointment, EVENT_TYPES, EventType } from "@/lib/types";
import {
  EVENT_COLORS, cn, daysUntil, fmtDate, fmtTime, isTodayISO, parseISO,
  toISODate, todayISO,
} from "@/lib/utils";
import { PageHead, useLookups } from "./common";
import { navigate } from "@/lib/nav";

type CalMode = "Month" | "Week" | "Today" | "Upcoming";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView() {
  const { db, user, addAppointment, pushToast } = useStore();
  const lk = useLookups();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [mode, setMode] = useState<CalMode>("Month");
  const [fType, setFType] = useState("All");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    title: "", type: "Client Meeting" as EventType, date: todayISO(),
    startTime: "10:00", endTime: "11:00", matterId: "", leadId: "", location: "", notes: "",
  });

  const events = useMemo(
    () => db.appointments.filter((a) => fType === "All" || a.type === fType),
    [db.appointments, fType]
  );

  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    events.forEach((a) => {
      m.set(a.date, [...(m.get(a.date) ?? []), a]);
    });
    return m;
  }, [events]);

  // Month grid
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  const upcoming = useMemo(
    () =>
      events
        .filter((a) => a.date >= todayISO())
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        .slice(0, 12),
    [events]
  );

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <PageHead
        title="Calendar"
        sub={`${events.filter((a) => a.date >= todayISO()).length} upcoming events & deadlines`}
        actions={
          <>
            <Segmented
              options={[
                { value: "Month", label: "Month" },
                { value: "Week", label: "Week" },
                { value: "Today", label: "Today" },
                { value: "Upcoming", label: "Upcoming" },
              ]}
              value={mode}
              onChange={setMode}
            />
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Icon name="plus" size={16} /> New Event
            </button>
          </>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <Select value={fType} onChange={(e) => setFType(e.target.value)} className="w-48">
          <option>All</option>
          {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {EVENT_TYPES.map((t) => (
            <span key={t} className="flex items-center gap-1 text-[10px] font-bold text-faint">
              <span className="h-2 w-2 rounded-full" style={{ background: EVENT_COLORS[t] }} />
              {t}
            </span>
          ))}
        </div>
      </Card>

      {mode === "Month" && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <button className="icon-btn" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
              <Icon name="chevron-left" size={16} />
            </button>
            <div className="text-sm font-extrabold text-ink">{monthLabel}</div>
            <div className="flex gap-2">
              <button className="btn-sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>Today</button>
              <button className="icon-btn" onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
                <Icon name="chevron-right" size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-faint">{d}</div>
            ))}
            {cells.map((d, i) => {
              const iso = toISODate(d);
              const dayEvents = byDate.get(iso) ?? [];
              const inMonth = d.getMonth() === cursor.getMonth();
              const today = isTodayISO(iso);
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[86px] rounded-xl p-1.5 transition-shadow",
                    inMonth ? "neu-inset-sm" : "opacity-40",
                    today && "shadow-neu-sm"
                  )}
                >
                  <div className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold",
                    today ? "bg-accent text-white shadow-neu-xs" : "text-sub"
                  )}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setDetail(a)}
                        className="block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[9.5px] font-bold text-white"
                        style={{ background: EVENT_COLORS[a.type] }}
                        title={a.title}
                      >
                        {fmtTime(a.startTime)} {a.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="px-1 text-[9px] font-bold text-faint">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {mode === "Week" && (
        <div className="grid gap-3 overflow-x-auto md:grid-cols-7">
          {weekDays.map((d) => {
            const iso = toISODate(d);
            const dayEvents = (byDate.get(iso) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <Card key={iso} className={cn("min-w-[180px] p-3", isTodayISO(iso) && "shadow-neu")}>
                <div className={cn("mb-2 text-center text-xs font-extrabold", isTodayISO(iso) ? "text-accent" : "text-ink")}>
                  {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </div>
                <div className="space-y-2">
                  {dayEvents.length === 0 && <div className="py-4 text-center text-[10px] font-semibold text-faint">—</div>}
                  {dayEvents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setDetail(a)}
                      className="neu-inset-sm w-full rounded-lg p-2 text-left transition-shadow hover:shadow-neu-xs"
                    >
                      <div className="mb-0.5 h-1 w-8 rounded-full" style={{ background: EVENT_COLORS[a.type] }} />
                      <div className="text-[10px] font-bold leading-tight text-ink">{a.title}</div>
                      <div className="text-[9px] font-semibold text-faint">{fmtTime(a.startTime)}</div>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {mode === "Today" && (
        <Card className="p-4">
          <div className="mb-3 text-sm font-extrabold text-ink">
            Today — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <EventList events={(byDate.get(todayISO()) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime))} onOpen={setDetail} />
        </Card>
      )}

      {mode === "Upcoming" && (
        <Card className="p-4">
          <EventList events={upcoming} onOpen={setDetail} showDate />
        </Card>
      )}

      {/* Event detail */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ""}>
        {detail && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="chip text-white" style={{ background: EVENT_COLORS[detail.type] }}>{detail.type}</span>
              {daysUntil(detail.date) >= 0 && (
                <Badge tone={daysUntil(detail.date) === 0 ? "warn" : "neutral"}>
                  {daysUntil(detail.date) === 0 ? "Today" : `in ${daysUntil(detail.date)}d`}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="neu-inset-sm rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-faint">Date</div>
                <div className="text-xs font-bold text-ink">{fmtDate(detail.date)}</div>
              </div>
              <div className="neu-inset-sm rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-faint">Time</div>
                <div className="text-xs font-bold text-ink">{fmtTime(detail.startTime)} – {fmtTime(detail.endTime)}</div>
              </div>
              <div className="neu-inset-sm rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-faint">Location</div>
                <div className="text-xs font-bold text-ink">{detail.location ?? "—"}</div>
              </div>
              <div className="neu-inset-sm rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-faint">Attendees</div>
                <div className="mt-1 flex -space-x-1.5">
                  {detail.attendeeIds.map((id) => (
                    <Avatar key={id} name={lk.userName(id)} size={24} className="ring-2 ring-base" />
                  ))}
                </div>
              </div>
            </div>
            {detail.notes && (
              <div className="neu-inset-sm rounded-xl p-3 text-xs leading-relaxed text-sub">{detail.notes}</div>
            )}
            {detail.matterId && (
              <button className="btn w-full" onClick={() => { setDetail(null); navigate("matters", detail.matterId); }}>
                <Icon name="briefcase" size={14} /> Open linked matter — {lk.matterName(detail.matterId)}
              </button>
            )}
            {detail.leadId && (
              <button className="btn w-full" onClick={() => { setDetail(null); navigate("leads", detail.leadId); }}>
                <Icon name="users" size={14} /> Open linked lead — {lk.leadName(detail.leadId)}
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* New event */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Event" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Consultation — Jane Smith" /></Field>
          </div>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as EventType }))}>
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Start"><Input type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} /></Field>
          <Field label="End"><Input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} /></Field>
          <Field label="Linked matter">
            <Select value={form.matterId} onChange={(e) => setForm((p) => ({ ...p, matterId: e.target.value, leadId: "" }))}>
              <option value="">None</option>
              {db.matters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Or linked lead">
            <Select value={form.leadId} onChange={(e) => setForm((p) => ({ ...p, leadId: e.target.value, matterId: "" }))}>
              <option value="">None</option>
              {db.leads.filter((l) => l.status !== "Converted" && l.status !== "Lost").map((l) => (
                <option key={l.id} value={l.id}>{l.firstName} {l.lastName} — {l.caseType}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Office, video call, courtroom…" /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!form.title.trim()}
            onClick={() => {
              const matter = form.matterId ? lk.matter(form.matterId) : undefined;
              addAppointment({
                title: form.title, type: form.type, date: form.date,
                startTime: form.startTime, endTime: form.endTime,
                matterId: form.matterId || undefined,
                leadId: form.leadId || undefined,
                clientId: matter?.clientId,
                attendeeIds: [user?.id ?? "u1"],
                location: form.location || undefined,
                notes: form.notes || undefined,
              });
              setOpen(false);
              setForm((p) => ({ ...p, title: "", notes: "" }));
              pushToast(form.type === "Consultation" ? "Consultation booked — confirmation automation fired" : "Event scheduled");
            }}
          >
            <Icon name="calendar" size={15} /> Schedule event
          </button>
        </div>
      </Modal>
    </div>
  );
}

function EventList({
  events, onOpen, showDate,
}: {
  events: Appointment[];
  onOpen: (a: Appointment) => void;
  showDate?: boolean;
}) {
  if (events.length === 0)
    return <Empty icon="calendar" title="No events" hint="Schedule consultations, hearings, deadlines and meetings." />;
  return (
    <div className="space-y-2">
      {events.map((a) => (
        <button
          key={a.id}
          onClick={() => onOpen(a)}
          className="neu-inset-sm flex w-full items-center gap-3 rounded-xl p-3 text-left transition-shadow hover:shadow-neu-xs"
        >
          <span className="flex h-10 w-1.5 shrink-0 rounded-full" style={{ background: EVENT_COLORS[a.type] }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-ink">{a.title}</span>
            <span className="text-[10px] font-semibold text-faint">
              {showDate ? `${fmtDate(a.date)} · ` : ""}{fmtTime(a.startTime)}–{fmtTime(a.endTime)}
              {a.location ? ` · ${a.location}` : ""}
            </span>
          </span>
          <Badge tone={a.type === "Court Hearing" || a.type === "Filing Deadline" ? "bad" : "accent"}>{a.type}</Badge>
        </button>
      ))}
    </div>
  );
}
