"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge, Card, Drawer, Empty, Field, Icon, Input, Modal, Select, Stat, Tabs, Toggle,
} from "@/components/neu";
import { Invoice } from "@/lib/types";
import { cn, fmtDate, fmtDateShort, fmtMoney, isPastDate } from "@/lib/utils";
import { PageHead, invBal, invPaid, invTotal, useLookups } from "./common";
import { navigate } from "@/lib/nav";

type BillTab = "invoices" | "time" | "expenses" | "payments";

const INV_TONE: Record<Invoice["status"], "neutral" | "accent" | "warn" | "ok" | "bad"> = {
  Draft: "neutral",
  Sent: "accent",
  Partial: "warn",
  Paid: "ok",
  Overdue: "bad",
};

export default function BillingView() {
  const { db, can, user, addInvoice, recordPayment, addTimeEntry, addExpense, pushToast } = useStore();
  const lk = useLookups();
  const [tab, setTab] = useState<BillTab>("invoices");
  const [invDetail, setInvDetail] = useState<string | null>(null);
  const [invOpen, setInvOpen] = useState(false);
  const [invForm, setInvForm] = useState({ clientId: "", matterId: "", dueInDays: 14, items: [{ desc: "", amount: 0 }] });
  const [payId, setPayId] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: "Card" });
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeForm, setTimeForm] = useState({ matterId: "", date: new Date().toISOString().slice(0, 10), hours: 1, rate: user?.hourlyRate ?? 350, description: "", billable: true });
  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({ matterId: "", date: new Date().toISOString().slice(0, 10), amount: 0, category: "Filing Fee", description: "", billable: true });

  const canEdit = can("billing.edit");

  const kpis = useMemo(() => {
    const outstanding = db.invoices.filter((i) => i.status !== "Paid" && i.status !== "Draft").reduce((s, i) => s + invBal(i), 0);
    const overdue = db.invoices.filter((i) => i.status !== "Paid" && i.status !== "Draft" && isPastDate(i.dueDate)).reduce((s, i) => s + invBal(i), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    const collected = db.invoices
      .flatMap((i) => i.payments)
      .filter((p) => new Date(p.date) >= monthStart)
      .reduce((s, p) => s + p.amount, 0);
    const unbilled = db.timeEntries.filter((t) => !t.invoiced && t.billable);
    return {
      outstanding,
      overdue,
      collected,
      unbilledHours: unbilled.reduce((s, t) => s + t.hours, 0),
      unbilledValue: unbilled.reduce((s, t) => s + t.hours * t.rate, 0),
    };
  }, [db.invoices, db.timeEntries]);

  const allPayments = useMemo(
    () =>
      db.invoices
        .flatMap((i) => i.payments.map((p) => ({ ...p, number: i.number, clientId: i.clientId })))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [db.invoices]
  );

  const detail = db.invoices.find((i) => i.id === invDetail) ?? null;

  return (
    <div>
      <PageHead
        title="Billing & Payments"
        sub="Invoices, timekeeping, expenses and collections"
        actions={
          canEdit ? (
            <>
              <button className="btn" onClick={() => { setTimeForm((p) => ({ ...p, rate: user?.hourlyRate ?? p.rate })); setTimeOpen(true); }}>
                <Icon name="clock" size={15} /> Log Time
              </button>
              <button className="btn" onClick={() => setExpOpen(true)}>
                <Icon name="card" size={15} /> Add Expense
              </button>
              <button className="btn-primary" onClick={() => setInvOpen(true)}>
                <Icon name="plus" size={15} /> New Invoice
              </button>
            </>
          ) : undefined
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Outstanding" value={fmtMoney(kpis.outstanding)} icon="money" tone="accent" />
        <Stat label="Overdue" value={fmtMoney(kpis.overdue)} icon="alert" tone="bad" />
        <Stat label="Collected this month" value={fmtMoney(kpis.collected)} icon="check" tone="ok" />
        <Stat label="Unbilled time" value={`${kpis.unbilledHours.toFixed(1)}h`} icon="clock" tone="warn" delta={fmtMoney(kpis.unbilledValue)} />
      </div>

      <Tabs
        className="mb-4 w-fit"
        value={tab}
        onChange={(v) => setTab(v as BillTab)}
        options={[
          { value: "invoices", label: `Invoices (${db.invoices.length})` },
          { value: "time", label: `Time Entries (${db.timeEntries.length})` },
          { value: "expenses", label: `Expenses (${db.expenses.length})` },
          { value: "payments", label: `Payments (${allPayments.length})` },
        ]}
      />

      {tab === "invoices" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-[#c6ccd866]">
                <tr>
                  <th className="th">Invoice</th>
                  <th className="th">Client</th>
                  <th className="th">Matter</th>
                  <th className="th">Issued</th>
                  <th className="th">Due</th>
                  <th className="th text-right">Total</th>
                  <th className="th text-right">Balance</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {db.invoices.map((inv) => (
                  <tr key={inv.id} className="tr cursor-pointer border-b border-[#c6ccd833] last:border-0" onClick={() => setInvDetail(inv.id)}>
                    <td className="td font-bold">{inv.number}</td>
                    <td className="td text-xs font-semibold">{lk.clientName(inv.clientId)}</td>
                    <td className="td text-xs text-sub">{inv.matterId ? lk.matterName(inv.matterId) : "—"}</td>
                    <td className="td text-xs text-sub">{fmtDateShort(inv.issueDate)}</td>
                    <td className={cn("td text-xs font-bold", inv.status !== "Paid" && isPastDate(inv.dueDate) ? "text-bad" : "text-sub")}>
                      {fmtDateShort(inv.dueDate)}
                    </td>
                    <td className="td text-right text-xs font-bold">{fmtMoney(invTotal(inv))}</td>
                    <td className={cn("td text-right text-xs font-bold", invBal(inv) > 0 ? "text-bad" : "text-ok")}>{fmtMoney(invBal(inv))}</td>
                    <td className="td"><Badge tone={INV_TONE[inv.status]}>{inv.status}</Badge></td>
                    <td className="td text-right">
                      {canEdit && invBal(inv) > 0 && (
                        <button
                          className="btn-sm"
                          onClick={(e) => { e.stopPropagation(); setPayId(inv.id); setPayForm({ amount: invBal(inv), method: "Card" }); }}
                        >
                          <Icon name="money" size={12} /> Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {db.invoices.length === 0 && <Empty icon="money" title="No invoices yet" />}
          </div>
        </Card>
      )}

      {tab === "time" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-[#c6ccd866]">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Timekeeper</th>
                  <th className="th">Matter</th>
                  <th className="th">Description</th>
                  <th className="th text-right">Hours</th>
                  <th className="th text-right">Rate</th>
                  <th className="th text-right">Value</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {db.timeEntries.map((t) => (
                  <tr key={t.id} className="tr border-b border-[#c6ccd833] last:border-0">
                    <td className="td text-xs font-semibold">{fmtDateShort(t.date)}</td>
                    <td className="td text-xs font-semibold">{lk.userName(t.userId)}</td>
                    <td className="td">
                      <button className="text-xs font-bold text-accent hover:underline" onClick={() => navigate("matters", t.matterId)}>
                        {lk.matterName(t.matterId)}
                      </button>
                    </td>
                    <td className="td text-xs text-sub">{t.description}</td>
                    <td className="td text-right text-xs font-bold">{t.hours.toFixed(1)}</td>
                    <td className="td text-right text-xs">{fmtMoney(t.rate)}</td>
                    <td className="td text-right text-xs font-bold">{fmtMoney(t.hours * t.rate)}</td>
                    <td className="td"><Badge tone={t.invoiced ? "neutral" : "accent"}>{t.invoiced ? "Invoiced" : "Unbilled"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {db.timeEntries.length === 0 && <Empty icon="clock" title="No time entries" />}
          </div>
        </Card>
      )}

      {tab === "expenses" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-[#c6ccd866]">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Matter</th>
                  <th className="th">Category</th>
                  <th className="th">Description</th>
                  <th className="th text-right">Amount</th>
                  <th className="th">Billable</th>
                </tr>
              </thead>
              <tbody>
                {db.expenses.map((e2) => (
                  <tr key={e2.id} className="tr border-b border-[#c6ccd833] last:border-0">
                    <td className="td text-xs font-semibold">{fmtDateShort(e2.date)}</td>
                    <td className="td">
                      <button className="text-xs font-bold text-accent hover:underline" onClick={() => navigate("matters", e2.matterId)}>
                        {lk.matterName(e2.matterId)}
                      </button>
                    </td>
                    <td className="td"><span className="chip text-sub">{e2.category}</span></td>
                    <td className="td text-xs text-sub">{e2.description}</td>
                    <td className="td text-right text-xs font-bold">{fmtMoney(e2.amount)}</td>
                    <td className="td">{e2.billable ? <Badge tone="ok">Billable</Badge> : <Badge tone="neutral">Firm</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {db.expenses.length === 0 && <Empty icon="card" title="No expenses" />}
          </div>
        </Card>
      )}

      {tab === "payments" && (
        <Card className="p-4">
          <div className="space-y-2">
            {allPayments.map((p) => (
              <div key={p.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                <span className="timeline-dot text-ok"><Icon name="money" size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-ink">{p.number} — {lk.clientName(p.clientId)}</div>
                  <div className="text-[10px] font-semibold text-faint">{fmtDate(p.date)}</div>
                </div>
                <Badge tone="ok">{p.method}</Badge>
                <span className="text-sm font-extrabold text-ok">{fmtMoney(p.amount)}</span>
              </div>
            ))}
            {allPayments.length === 0 && <Empty icon="money" title="No payments recorded" />}
          </div>
        </Card>
      )}

      {/* Invoice drawer */}
      <Drawer open={detail !== null} onClose={() => setInvDetail(null)} title={detail ? `Invoice ${detail.number}` : ""} width={520}>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-ink">{lk.clientName(detail.clientId)}</div>
                <div className="text-[11px] font-semibold text-faint">
                  {detail.matterId ? lk.matterName(detail.matterId) : "General"} · issued {fmtDate(detail.issueDate)}
                </div>
              </div>
              <Badge tone={INV_TONE[detail.status]}>{detail.status}</Badge>
            </div>
            <div className="neu-inset rounded-xl p-4">
              <div className="space-y-2">
                {detail.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-semibold text-sub">{it.desc}</span>
                    <span className="font-bold text-ink">{fmtMoney(it.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t border-[#c6ccd866] pt-3 text-xs">
                <div className="flex justify-between font-semibold text-sub"><span>Total</span><span>{fmtMoney(invTotal(detail))}</span></div>
                <div className="flex justify-between font-semibold text-ok"><span>Paid</span><span>−{fmtMoney(invPaid(detail))}</span></div>
                <div className="flex justify-between text-sm font-extrabold text-ink"><span>Balance due</span><span>{fmtMoney(invBal(detail))}</span></div>
              </div>
            </div>
            {detail.payments.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Payments</div>
                <div className="space-y-1.5">
                  {detail.payments.map((p) => (
                    <div key={p.id} className="neu-inset-sm flex items-center justify-between rounded-lg p-2.5 text-xs">
                      <span className="font-semibold text-sub">{fmtDate(p.date)} · {p.method}</span>
                      <span className="font-bold text-ok">{fmtMoney(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {canEdit && invBal(detail) > 0 && (
              <button
                className="btn-primary w-full"
                onClick={() => { setPayId(detail.id); setPayForm({ amount: invBal(detail), method: "Card" }); }}
              >
                <Icon name="money" size={15} /> Record payment
              </button>
            )}
          </div>
        )}
      </Drawer>

      {/* New invoice */}
      <Modal open={invOpen} onClose={() => setInvOpen(false)} title="New Invoice" wide>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client">
              <Select value={invForm.clientId} onChange={(e) => setInvForm((p) => ({ ...p, clientId: e.target.value, matterId: "" }))}>
                <option value="">Select…</option>
                {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Matter (optional)">
              <Select value={invForm.matterId} onChange={(e) => setInvForm((p) => ({ ...p, matterId: e.target.value }))}>
                <option value="">None</option>
                {db.matters.filter((m) => !invForm.clientId || m.clientId === invForm.clientId).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Line items">
            <div className="space-y-2">
              {invForm.items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Description" value={it.desc} onChange={(e) => setInvForm((p) => ({ ...p, items: p.items.map((x, xi) => (xi === i ? { ...x, desc: e.target.value } : x)) }))} />
                  <Input type="number" min="0" className="w-28" placeholder="0" value={it.amount || ""} onChange={(e) => setInvForm((p) => ({ ...p, items: p.items.map((x, xi) => (xi === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x)) }))} />
                  <button className="icon-btn shrink-0" disabled={invForm.items.length === 1} onClick={() => setInvForm((p) => ({ ...p, items: p.items.filter((_, xi) => xi !== i) }))}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
              <button className="btn-sm" onClick={() => setInvForm((p) => ({ ...p, items: [...p.items, { desc: "", amount: 0 }] }))}>
                <Icon name="plus" size={13} /> Add line
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due in (days)"><Input type="number" min="1" value={invForm.dueInDays} onChange={(e) => setInvForm((p) => ({ ...p, dueInDays: parseInt(e.target.value) || 14 }))} /></Field>
            <div className="neu-inset-sm flex items-center justify-between rounded-xl px-3 text-sm font-bold">
              <span className="text-faint">Total</span>
              <span>{fmtMoney(invForm.items.reduce((s, i) => s + i.amount, 0))}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setInvOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!invForm.clientId || invForm.items.every((i) => !i.desc.trim() || i.amount <= 0)}
              onClick={() => {
                addInvoice({ clientId: invForm.clientId, matterId: invForm.matterId || undefined, items: invForm.items.filter((i) => i.desc.trim() && i.amount > 0), dueInDays: invForm.dueInDays });
                setInvOpen(false);
                setInvForm({ clientId: "", matterId: "", dueInDays: 14, items: [{ desc: "", amount: 0 }] });
                pushToast("Invoice issued and sent");
              }}
            >Issue invoice</button>
          </div>
        </div>
      </Modal>

      {/* Payment */}
      <Modal open={payId !== null} onClose={() => setPayId(null)} title="Record Payment">
        <div className="space-y-3">
          <Field label="Amount ($)"><Input type="number" min="0" value={payForm.amount || ""} onChange={(e) => setPayForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} /></Field>
          <Field label="Method">
            <Select value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}>
              {["Card", "ACH", "Check", "Wire"].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setPayId(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={payForm.amount <= 0}
              onClick={() => {
                if (payId) recordPayment(payId, payForm.amount, payForm.method as "Card" | "ACH" | "Check" | "Wire");
                setPayId(null);
                setInvDetail(null);
                pushToast("Payment recorded — client notified");
              }}
            >Record payment</button>
          </div>
        </div>
      </Modal>

      {/* Time */}
      <Modal open={timeOpen} onClose={() => setTimeOpen(false)} title="Log Time">
        <div className="space-y-3">
          <Field label="Matter">
            <Select value={timeForm.matterId} onChange={(e) => setTimeForm((p) => ({ ...p, matterId: e.target.value }))}>
              <option value="">Select…</option>
              {db.matters.filter((m) => m.status !== "Closed").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date"><Input type="date" value={timeForm.date} onChange={(e) => setTimeForm((p) => ({ ...p, date: e.target.value }))} /></Field>
            <Field label="Hours"><Input type="number" step="0.1" min="0" value={timeForm.hours} onChange={(e) => setTimeForm((p) => ({ ...p, hours: parseFloat(e.target.value) || 0 }))} /></Field>
            <Field label="Rate"><Input type="number" min="0" value={timeForm.rate} onChange={(e) => setTimeForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))} /></Field>
          </div>
          <Field label="Description"><Input value={timeForm.description} onChange={(e) => setTimeForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Draft motion to compel" /></Field>
          <label className="neu-inset-sm flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5">
            <span className="text-xs font-bold text-sub">Billable to client</span>
            <Toggle on={timeForm.billable} onChange={(v) => setTimeForm((p) => ({ ...p, billable: v }))} />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setTimeOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!timeForm.matterId || !timeForm.description.trim() || timeForm.hours <= 0}
              onClick={() => {
                addTimeEntry({ matterId: timeForm.matterId, date: timeForm.date, hours: timeForm.hours, rate: timeForm.rate, description: timeForm.description, billable: timeForm.billable });
                setTimeOpen(false);
                setTimeForm((p) => ({ ...p, description: "", hours: 1 }));
                pushToast("Time logged");
              }}
            >Log time</button>
          </div>
        </div>
      </Modal>

      {/* Expense */}
      <Modal open={expOpen} onClose={() => setExpOpen(false)} title="Add Expense">
        <div className="space-y-3">
          <Field label="Matter">
            <Select value={expForm.matterId} onChange={(e) => setExpForm((p) => ({ ...p, matterId: e.target.value }))}>
              <option value="">Select…</option>
              {db.matters.filter((m) => m.status !== "Closed").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
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
          <label className="neu-inset-sm flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5">
            <span className="text-xs font-bold text-sub">Billable to client</span>
            <Toggle on={expForm.billable} onChange={(v) => setExpForm((p) => ({ ...p, billable: v }))} />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setExpOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!expForm.matterId || !expForm.description.trim() || expForm.amount <= 0}
              onClick={() => {
                addExpense({ matterId: expForm.matterId, date: expForm.date, amount: expForm.amount, category: expForm.category, description: expForm.description, billable: expForm.billable });
                setExpOpen(false);
                setExpForm((p) => ({ ...p, description: "", amount: 0 }));
                pushToast("Expense added");
              }}
            >Add expense</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
