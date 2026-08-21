"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Avatar, Badge, Card, Empty, Icon, Section, Stat, Textarea,
} from "@/components/neu";
import { cn, fmtDate, fmtDateShort, fmtMoney, fmtTime, timeAgo } from "@/lib/utils";
import { downloadDemo, fmtKb, invBal, invTotal } from "./common";

/**
 * Client portal — strictly scoped to the logged-in client's own records.
 */
export default function PortalView() {
  const { db, user, logout, addComm, updateTask, recordPayment, pushToast } = useStore();
  const [msg, setMsg] = useState("");

  const clientId = user?.clientId;
  const client = db.clients.find((c) => c.id === clientId);

  const scoped = useMemo(() => {
    if (!clientId) return null;
    return {
      matters: db.matters.filter((m) => m.clientId === clientId),
      appts: db.appointments
        .filter((a) => a.clientId === clientId && a.date >= new Date().toISOString().slice(0, 10))
        .sort((a, b) => a.date.localeCompare(b.date)),
      docs: db.documents.filter((d) => d.clientId === clientId),
      invoices: db.invoices.filter((i) => i.clientId === clientId),
      comms: db.communications.filter((c) => c.clientId === clientId),
      tasks: db.tasks.filter((t) => t.clientId === clientId && t.status !== "Completed"),
    };
  }, [db, clientId]);

  if (!user) return null;

  const attorney = client ? db.users.find((u) => u.id === client.attorneyId) : null;
  const outstanding = scoped?.invoices.reduce((s, i) => s + invBal(i), 0) ?? 0;

  return (
    <div className="min-h-screen bg-base">
      {/* Portal header */}
      <header className="border-b border-[#c6ccd866] bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-neu-sm">
            <Icon name="scales" size={19} />
          </span>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-ink">Shah &amp; Reyes LLP</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-faint">Secure Client Portal</div>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={user.name} color={user.color} size={34} />
            <button className="icon-btn" onClick={logout} title="Sign out">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 pb-16">
        <div className="mb-5">
          <h1 className="text-xl font-extrabold tracking-tight text-ink">
            Welcome, {user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-sub">
            Track your case, appointments, documents and invoices — all in one place.
          </p>
        </div>

        {!scoped ? (
          <Card>
            <Empty
              icon="lock"
              title="No case file linked yet"
              hint="Once the firm opens a matter for you, your case status, documents and invoices will appear here automatically."
            />
          </Card>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Active matters" value={scoped.matters.filter((m) => m.status !== "Closed").length} icon="briefcase" tone="accent" />
              <Stat label="Upcoming events" value={scoped.appts.length} icon="calendar" tone="viol" />
              <Stat label="Documents" value={scoped.docs.length} icon="file" tone="ink" />
              <Stat label="Balance due" value={fmtMoney(outstanding)} icon="money" tone={outstanding > 0 ? "bad" : "ok"} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Case status */}
              <Section title="My Case Status" subtitle="Live status from your legal team">
                {scoped.matters.length === 0 && <Empty icon="briefcase" title="No matters yet" />}
                <div className="space-y-3">
                  {scoped.matters.map((m) => {
                    const atty = db.users.find((u) => u.id === m.attorneyId);
                    return (
                      <div key={m.id} className="neu-inset-sm rounded-xl p-4">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-ink">{m.name}</span>
                          <Badge tone={m.status === "Closed" ? "neutral" : "accent"}>{m.status}</Badge>
                        </div>
                        <div className="text-[10px] font-semibold text-faint">
                          {m.number} · {m.practiceArea}
                        </div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <Avatar name={atty?.name ?? "?"} color={atty?.color} size={24} />
                          <span className="text-[11px] font-semibold text-sub">
                            {atty?.name} — your attorney
                          </span>
                        </div>
                        {m.nextDeadline && (
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-warn">
                            <Icon name="clock" size={11} /> Next milestone: {fmtDate(m.nextDeadline)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* Appointments */}
              <Section title="Upcoming Appointments">
                {scoped.appts.length === 0 && <Empty icon="calendar" title="Nothing scheduled" hint="New appointments appear here automatically." />}
                <div className="space-y-2">
                  {scoped.appts.map((a) => (
                    <div key={a.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                      <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-accent text-white shadow-neu-xs">
                        <span className="text-[13px] font-extrabold leading-none">{a.date.slice(8, 10)}</span>
                        <span className="text-[8px] font-bold uppercase">
                          {new Date(a.date + "T12:00").toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ink">{a.title}</span>
                        <span className="text-[10px] font-semibold text-faint">
                          {fmtTime(a.startTime)}{a.location ? ` · ${a.location}` : ""}
                        </span>
                      </span>
                      <Badge tone="accent">{a.type}</Badge>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Documents */}
              <Section title="My Documents" subtitle="Shared securely by your legal team">
                {scoped.docs.length === 0 && <Empty icon="folder" title="No documents shared yet" />}
                <div className="space-y-2">
                  {scoped.docs.map((d) => (
                    <div key={d.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                      <span className="timeline-dot text-accent"><Icon name="file" size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-ink">{d.name}</div>
                        <div className="text-[10px] font-semibold text-faint">{fmtKb(d.sizeKb)} · {timeAgo(d.uploadedAt)}</div>
                      </div>
                      <button className="icon-btn h-8 w-8" title="Download" onClick={() => downloadDemo(d.name, d.name)}>
                        <Icon name="download" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Invoices */}
              <Section title="Invoices & Payments">
                {scoped.invoices.length === 0 && <Empty icon="money" title="No invoices" />}
                <div className="space-y-2">
                  {scoped.invoices.map((inv) => (
                    <div key={inv.id} className="neu-inset-sm rounded-xl p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-ink">{inv.number}</div>
                          <div className="text-[10px] font-semibold text-faint">
                            {fmtMoney(invTotal(inv))} · due {fmtDateShort(inv.dueDate)}
                          </div>
                        </div>
                        <Badge tone={inv.status === "Paid" ? "ok" : inv.status === "Overdue" ? "bad" : "warn"}>{inv.status}</Badge>
                      </div>
                      {invBal(inv) > 0 && (
                        <button
                          className="btn-primary mt-2.5 w-full"
                          onClick={() => {
                            recordPayment(inv.id, invBal(inv), "Card");
                            pushToast("Payment received — thank you");
                          }}
                        >
                          <Icon name="card" size={14} /> Pay {fmtMoney(invBal(inv))} securely
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Section>

              {/* Requested items */}
              <Section title="Requested From Me" subtitle="Items your legal team needs">
                {scoped.tasks.length === 0 && <Empty icon="check-square" title="Nothing requested right now" />}
                <div className="space-y-2">
                  {scoped.tasks.map((t) => (
                    <div key={t.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-ink">{t.title}</div>
                        <div className="text-[10px] font-semibold text-faint">Due {fmtDateShort(t.dueDate)}</div>
                      </div>
                      <button
                        className="btn-sm"
                        onClick={() => { updateTask(t.id, { status: "Completed" }); pushToast("Marked as done — your team was notified"); }}
                      >
                        <Icon name="check" size={12} /> Done
                      </button>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Secure messages */}
              <Section title="Secure Messages" subtitle={attorney ? `With ${attorney.name}` : undefined}>
                <div className="mb-3 max-h-56 space-y-2 overflow-y-auto">
                  {scoped.comms.length === 0 && (
                    <p className="py-4 text-center text-xs text-faint">No messages yet — say hello below.</p>
                  )}
                  {scoped.comms.map((c) => (
                    <div key={c.id} className={cn("max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed", c.direction === "Inbound" ? "ml-auto bg-accent text-white shadow-neu-xs" : "neu-inset-sm text-sub")}>
                      <div className={cn("mb-0.5 text-[9px] font-bold uppercase tracking-wide", c.direction === "Inbound" ? "text-white/70" : "text-faint")}>
                        {c.fromName} · {timeAgo(c.at)}
                      </div>
                      {c.body}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Write a secure message to your attorney…"
                    className="flex-1"
                  />
                  <button
                    className="btn-primary shrink-0 self-end"
                    disabled={!msg.trim()}
                    onClick={() => {
                      addComm({
                        type: "Email",
                        direction: "Inbound",
                        toName: attorney?.name ?? "Your attorney",
                        body: msg,
                        clientId,
                        matterId: scoped.matters[0]?.id,
                      });
                      setMsg("");
                      pushToast("Message sent securely");
                    }}
                  >
                    <Icon name="send" size={15} />
                  </button>
                </div>
              </Section>
            </div>
          </>
        )}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-faint">
          <Icon name="lock" size={12} /> 256-bit encrypted · You can only see your own case data
        </p>
      </main>
    </div>
  );
}
