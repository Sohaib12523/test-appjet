"use client";

import React, { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Avatar, Badge, Card, Icon, ProgressRing, Section } from "@/components/neu";
import { AreaChart, Donut, HBars } from "@/components/charts";
import { PageHead, invBal, invPaid, invTotal, useLookups } from "./common";
import { PA_COLORS, fmtMoney } from "@/lib/utils";

const SOURCE_COLORS = ["#2f6bff", "#7a5af8", "#2f9e77", "#c9862b", "#0e9bb5", "#b065d8", "#5d6b8c"];

/** Rough monthly ad/channel spend per source, for the ROI report. */
const SOURCE_SPEND: Record<string, number> = {
  "Website Form": 400,
  "Google Ads": 4200,
  Referral: 600,
  Avvo: 1800,
  "Walk-in": 0,
  "Social Media": 1500,
  "Bar Association": 300,
};

export default function ReportsView() {
  const { db } = useStore();
  const lk = useLookups();

  const r = useMemo(() => {
    const total = db.leads.length;
    const converted = db.leads.filter((l) => l.status === "Converted");
    const lost = db.leads.filter((l) => l.status === "Lost");
    const consulted = db.leads.filter((l) =>
      ["Consultation Completed", "Retainer Sent", "Retainer Signed", "Converted", "Lost"].includes(l.status)
    );

    const srcMap = new Map<string, number>();
    db.leads.forEach((l) => srcMap.set(l.source, (srcMap.get(l.source) ?? 0) + 1));
    const bySource = [...srcMap.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }));

    const paMap = new Map<string, number>();
    db.leads.forEach((l) => paMap.set(l.practiceArea, (paMap.get(l.practiceArea) ?? 0) + 1));
    const byPA = [...paMap.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: PA_COLORS[label as keyof typeof PA_COLORS] }));

    const statusMap = new Map<string, number>();
    db.matters.forEach((m) => statusMap.set(m.status, (statusMap.get(m.status) ?? 0) + 1));
    const matterStatus = [...statusMap.entries()].map(([label, value], i) => ({ label, value, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }));

    // Client acquisition per month (last 6)
    const now = new Date();
    const acquisition = Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: dt.toLocaleDateString("en-US", { month: "short" }),
        value: db.clients.filter((c) => {
          const d2 = new Date(c.since);
          return d2.getFullYear() === dt.getFullYear() && d2.getMonth() === dt.getMonth();
        }).length,
      };
    });

    const revenue = Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        label: dt.toLocaleDateString("en-US", { month: "short" }),
        value: db.invoices.flatMap((inv) => inv.payments).filter((p) => {
          const pd = new Date(p.date);
          return pd.getFullYear() === dt.getFullYear() && pd.getMonth() === dt.getMonth();
        }).reduce((s, p) => s + p.amount, 0),
      };
    });

    const attorneys = db.users.filter((u) => u.role === "attorney" || u.role === "super_admin");
    const performance = attorneys.map((a) => {
      const leads = db.leads.filter((l) => l.assignedAttorneyId === a.id);
      const conv = leads.filter((l) => l.status === "Converted");
      const hours = db.timeEntries.filter((t) => t.userId === a.id);
      const matters = db.matters.filter((m) => m.attorneyId === a.id && m.status !== "Closed");
      return {
        a,
        leads: leads.length,
        converted: conv.length,
        rate: leads.length ? Math.round((conv.length / leads.length) * 100) : 0,
        hours: hours.reduce((s, t) => s + t.hours, 0),
        value: hours.reduce((s, t) => s + t.hours * t.rate, 0),
        matters: matters.length,
      };
    });

    const outstanding = db.invoices.filter((i) => i.status !== "Paid" && i.status !== "Draft");

    const roi = Object.keys(SOURCE_SPEND).map((src) => {
      const leads = db.leads.filter((l) => l.source === src);
      const won = leads.filter((l) => l.status === "Converted");
      const value = won.reduce((s, l) => s + l.estimatedValue, 0);
      const spend = SOURCE_SPEND[src] ?? 0;
      return {
        src,
        leads: leads.length,
        converted: won.length,
        spend,
        value,
        roi: spend > 0 ? Math.round(((value - spend) / spend) * 100) : null,
      };
    }).filter((x) => x.leads > 0 || x.spend > 0);

    return {
      convRate: total ? Math.round((converted.length / total) * 100) : 0,
      converted: converted.length,
      lost: lost.length,
      total,
      consultRate: consulted.length ? Math.round((converted.length / consulted.length) * 100) : 0,
      consulted: consulted.length,
      bySource, byPA, matterStatus, acquisition, revenue, performance, outstanding, roi,
    };
  }, [db]);

  return (
    <div>
      <PageHead
        title="Reports & Analytics"
        sub="Firm performance across the full client lifecycle"
        actions={
          <button className="btn" onClick={() => window.print()}>
            <Icon name="printer" size={15} /> Print / PDF
          </button>
        }
      />

      {/* Conversion rings */}
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <Section title="Lead Conversion Rate" subtitle={`${r.converted} converted · ${r.lost} lost · ${r.total} total leads`}>
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing value={r.convRate} size={150} label="converted" />
            <div className="flex-1 space-y-2 text-xs">
              <div className="neu-inset-sm flex justify-between rounded-lg p-2.5"><span className="font-semibold text-sub">Total leads</span><span className="font-bold text-ink">{r.total}</span></div>
              <div className="neu-inset-sm flex justify-between rounded-lg p-2.5"><span className="font-semibold text-sub">Converted to clients</span><span className="font-bold text-ok">{r.converted}</span></div>
              <div className="neu-inset-sm flex justify-between rounded-lg p-2.5"><span className="font-semibold text-sub">Lost</span><span className="font-bold text-bad">{r.lost}</span></div>
            </div>
          </div>
        </Section>
        <Section title="Consultation → Client" subtitle={`${r.converted} of ${r.consulted} consulted leads signed`}>
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing value={r.consultRate} size={150} color="#2f9e77" label="post-consult" />
            <div className="flex-1 space-y-2 text-xs">
              <div className="neu-inset-sm flex justify-between rounded-lg p-2.5"><span className="font-semibold text-sub">Reached consult stage</span><span className="font-bold text-ink">{r.consulted}</span></div>
              <div className="neu-inset-sm flex justify-between rounded-lg p-2.5"><span className="font-semibold text-sub">Signed as clients</span><span className="font-bold text-ok">{r.converted}</span></div>
            </div>
          </div>
        </Section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Section title="Revenue Collected" subtitle="Payments per month" className="xl:col-span-2">
          <AreaChart data={r.revenue} money />
        </Section>
        <Section title="Leads by Source" subtitle="Volume by channel">
          <Donut data={r.bySource} size={150} centerLabel="leads" />
        </Section>
        <Section title="Client Acquisition" subtitle="New clients per month" className="xl:col-span-2">
          <AreaChart data={r.acquisition} />
        </Section>
        <Section title="Leads by Practice Area">
          <HBars data={r.byPA} />
        </Section>
        <Section title="Matters by Status" className="xl:col-span-1">
          <Donut data={r.matterStatus} size={150} centerLabel="matters" />
        </Section>

        {/* Attorney performance */}
        <Section title="Attorney Performance" subtitle="Leads, conversion and billed value" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-[#c6ccd866]">
                  <th className="th">Attorney</th>
                  <th className="th text-right">Leads</th>
                  <th className="th text-right">Conv.</th>
                  <th className="th text-right">Conv %</th>
                  <th className="th text-right">Active Matters</th>
                  <th className="th text-right">Hours</th>
                  <th className="th text-right">Time Value</th>
                </tr>
              </thead>
              <tbody>
                {r.performance.map((p) => (
                  <tr key={p.a.id} className="border-b border-[#c6ccd833] last:border-0">
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.a.name} color={p.a.color} size={26} />
                        <span className="text-xs font-bold">{p.a.name}</span>
                      </div>
                    </td>
                    <td className="td text-right text-xs font-semibold">{p.leads}</td>
                    <td className="td text-right text-xs font-semibold">{p.converted}</td>
                    <td className="td text-right"><Badge tone={p.rate >= 20 ? "ok" : "warn"}>{p.rate}%</Badge></td>
                    <td className="td text-right text-xs font-semibold">{p.matters}</td>
                    <td className="td text-right text-xs font-semibold">{p.hours.toFixed(1)}</td>
                    <td className="td text-right text-xs font-bold">{fmtMoney(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Marketing ROI */}
        <Section title="Marketing ROI" subtitle="Case value won vs channel spend" className="xl:col-span-1">
          <div className="space-y-2">
            {r.roi.map((x) => (
              <div key={x.src} className="neu-inset-sm rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">{x.src}</span>
                  <Badge tone={x.roi === null ? "neutral" : x.roi >= 100 ? "ok" : x.roi >= 0 ? "warn" : "bad"}>
                    {x.roi === null ? "n/a" : `${x.roi > 0 ? "+" : ""}${x.roi}%`}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-faint">
                  <span>{x.leads} leads · {x.converted} won</span>
                  <span>spend {fmtMoney(x.spend)} → value {fmtMoney(x.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Outstanding payments */}
        <Section title="Outstanding Payments" subtitle="Open invoice balances by age" className="xl:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[#c6ccd866]">
                  <th className="th">Invoice</th>
                  <th className="th">Client</th>
                  <th className="th">Due date</th>
                  <th className="th text-right">Total</th>
                  <th className="th text-right">Paid</th>
                  <th className="th text-right">Balance</th>
                  <th className="th text-right">Days overdue</th>
                </tr>
              </thead>
              <tbody>
                {r.outstanding.map((inv) => {
                  const overdueDays = Math.max(0, Math.round((Date.now() - new Date(inv.dueDate).getTime()) / 86400000));
                  return (
                    <tr key={inv.id} className="border-b border-[#c6ccd833] last:border-0">
                      <td className="td text-xs font-bold">{inv.number}</td>
                      <td className="td text-xs font-semibold">{lk.clientName(inv.clientId)}</td>
                      <td className="td text-xs text-sub">{new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                      <td className="td text-right text-xs font-semibold">{fmtMoney(invTotal(inv))}</td>
                      <td className="td text-right text-xs font-semibold text-ok">{fmtMoney(invPaid(inv))}</td>
                      <td className="td text-right text-xs font-bold text-bad">{fmtMoney(invBal(inv))}</td>
                      <td className="td text-right">
                        {overdueDays > 0 ? <Badge tone="bad">{overdueDays}d</Badge> : <Badge tone="neutral">Not due</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {r.outstanding.length === 0 && (
              <p className="py-8 text-center text-xs font-semibold text-ok">All invoices are paid — clean books.</p>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
