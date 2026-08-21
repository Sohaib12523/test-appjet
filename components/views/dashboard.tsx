"use client";

import React, { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Avatar, Badge, Card, Icon, Section, Stat, Timeline } from "@/components/neu";
import { AreaChart, Donut, HBars } from "@/components/charts";
import { PageHead, effectiveTaskStatus, invBal, invPaid, useLookups } from "./common";
import { LEAD_STATUSES, LeadStatus } from "@/lib/types";
import {
  LEAD_STATUS_TONE,
  PA_COLORS,
  EVENT_COLORS,
  cn,
  daysUntil,
  fmtDateShort,
  fmtMoney,
  fmtTime,
  isThisWeek,
  isTodayISO,
  timeAgo,
  todayISO,
} from "@/lib/utils";
import { navigate } from "@/lib/nav";

const TONE_HEX: Record<string, string> = {
  accent: "#2f6bff",
  viol: "#7a5af8",
  ink: "#1f2a44",
  warn: "#c9862b",
  ok: "#2f9e77",
  bad: "#d05555",
  neutral: "#8b97b5",
};

const SOURCE_COLORS = [
  "#2f6bff",
  "#7a5af8",
  "#2f9e77",
  "#c9862b",
  "#0e9bb5",
  "#b065d8",
  "#5d6b8c",
];

export default function DashboardView() {
  const { db, user, updateTask, pushToast } = useStore();
  const lk = useLookups();

  const d = useMemo(() => {
    const today = todayISO();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const newLeadsWeek = db.leads.filter(
      (l) => new Date(l.createdAt) >= weekAgo
    ).length;
    const consultsWeek = db.appointments.filter(
      (a) => a.type === "Consultation" && isThisWeek(a.date)
    );
    const consultsToday = consultsWeek.filter((a) => isTodayISO(a.date)).length;
    const activeMatters = db.matters.filter((m) => m.status !== "Closed");
    const followUps = db.leads.filter(
      (l) =>
        l.nextFollowUpAt &&
        l.nextFollowUpAt <= today &&
        l.status !== "Converted" &&
        l.status !== "Lost"
    );
    const recentDocs = db.documents.filter(
      (doc) => new Date(doc.uploadedAt) >= weekAgo
    );
    const outstanding = db.invoices
      .filter((i) => i.status !== "Paid" && i.status !== "Draft")
      .reduce((s, i) => s + invBal(i), 0);
    const unpaidCount = db.invoices.filter(
      (i) => i.status !== "Paid" && i.status !== "Draft"
    ).length;

    const pipeline = LEAD_STATUSES.map((s: LeadStatus) => ({
      label: s,
      value: db.leads.filter((l) => l.status === s).length,
      color: TONE_HEX[LEAD_STATUS_TONE[s]],
    })).filter((p) => p.value > 0 || ["New Lead", "Contacted", "Qualified"].includes(p.label as LeadStatus));

    const srcMap = new Map<string, number>();
    db.leads.forEach((l) => srcMap.set(l.source, (srcMap.get(l.source) ?? 0) + 1));
    const sources = [...srcMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        color: SOURCE_COLORS[i % SOURCE_COLORS.length],
      }));

    const paMap = new Map<string, number>();
    db.matters.forEach((m) =>
      paMap.set(m.practiceArea, (paMap.get(m.practiceArea) ?? 0) + 1)
    );
    const mattersByPA = [...paMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        color: PA_COLORS[label as keyof typeof PA_COLORS] ?? "#5d6b8c",
      }));

    // Revenue collected per month (last 6 months)
    const months: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = dt.toLocaleDateString("en-US", { month: "short" });
      const value = db.invoices
        .flatMap((inv) => inv.payments)
        .filter((p) => {
          const pd = new Date(p.date);
          return (
            pd.getFullYear() === dt.getFullYear() && pd.getMonth() === dt.getMonth()
          );
        })
        .reduce((s, p) => s + p.amount, 0);
      months.push({ label, value });
    }
    const collectedTotal = db.invoices
      .flatMap((i) => i.payments)
      .reduce((s, p) => s + p.amount, 0);

    const deadlines = [
      ...db.matters
        .filter((m) => m.nextDeadline && m.status !== "Closed")
        .map((m) => ({
          id: "m" + m.id,
          date: m.nextDeadline!,
          title: m.name,
          sub: `${m.number} · ${lk.clientName(m.clientId)}`,
          color: "#c9862b",
          view: "matters",
          ref: m.id,
        })),
      ...db.appointments
        .filter((a) => a.type === "Filing Deadline" && a.date >= today)
        .map((a) => ({
          id: "a" + a.id,
          date: a.date,
          title: a.title,
          sub: a.matterId ? lk.matterName(a.matterId) : "Firm",
          color: "#d05555",
          view: "calendar",
          ref: a.id,
        })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);

    const todaysTasks = db.tasks
      .filter((t) => t.status !== "Completed" && t.dueDate <= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);

    const upcomingConsults = db.appointments
      .filter((a) => a.type === "Consultation" && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);

    const activity = db.activities.slice(0, 8).map((a) => ({
      id: a.id,
      at: a.at,
      icon: a.actor === "System" ? "bolt" : "dot",
      color: a.actor === "System" ? "#c9862b" : "#2f6bff",
      title: a.text,
      body: a.actor !== "System" ? `by ${a.actor}` : undefined,
    }));

    return {
      newLeadsWeek,
      consultsWeek: consultsWeek.length,
      consultsToday,
      activeMatters: activeMatters.length,
      followUps: followUps.length,
      recentDocs: recentDocs.length,
      outstanding,
      unpaidCount,
      pipeline,
      sources,
      mattersByPA,
      months,
      collectedTotal,
      deadlines,
      todaysTasks,
      upcomingConsults,
      activity,
    };
  }, [db, lk]);

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHead
        title={`Good to see you, ${firstName}`}
        sub={`Here's what's happening at the firm — ${new Date().toLocaleDateString(
          "en-US",
          { weekday: "long", month: "long", day: "numeric" }
        )}`}
      />

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="New Leads"
          value={d.newLeadsWeek}
          icon="users"
          tone="accent"
          delta="last 7 days"
          onClick={() => navigate("leads")}
        />
        <Stat
          label="Consultations"
          value={d.consultsWeek}
          icon="calendar"
          tone="viol"
          delta={`${d.consultsToday} today`}
          onClick={() => navigate("calendar")}
        />
        <Stat
          label="Active Matters"
          value={d.activeMatters}
          icon="briefcase"
          tone="ink"
          onClick={() => navigate("matters")}
        />
        <Stat
          label="Follow-ups Due"
          value={d.followUps}
          icon="clock"
          tone="warn"
          delta="needs attention"
          onClick={() => navigate("leads")}
        />
        <Stat
          label="Pending Documents"
          value={d.recentDocs}
          icon="file"
          tone="neutral"
          delta="uploaded this week"
          onClick={() => navigate("documents")}
        />
        <Stat
          label="Outstanding"
          value={fmtMoney(d.outstanding)}
          icon="money"
          tone="bad"
          delta={`${d.unpaidCount} open invoices`}
          onClick={() => navigate("billing")}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Lead pipeline */}
        <Section
          className="xl:col-span-2"
          title="Lead Pipeline"
          subtitle="Live leads by stage"
          right={
            <button className="btn-sm" onClick={() => navigate("leads")}>
              View pipeline <Icon name="arrow-right" size={13} />
            </button>
          }
        >
          <HBars data={d.pipeline} />
        </Section>

        {/* Leads by source */}
        <Section title="Leads by Source" subtitle="All-time lead origin">
          <Donut
            data={d.sources}
            centerLabel="total leads"
            centerValue={String(db.leads.length)}
          />
        </Section>

        {/* Revenue */}
        <Section
          className="xl:col-span-2"
          title="Revenue Overview"
          subtitle={`${fmtMoney(d.collectedTotal)} collected to date`}
          right={<Badge tone="ok">Collected</Badge>}
        >
          <AreaChart data={d.months} money />
        </Section>

        {/* Matters by practice area */}
        <Section title="Matters by Practice Area" subtitle="Active caseload mix">
          <HBars data={d.mattersByPA} />
        </Section>

        {/* Today's tasks */}
        <Section
          title="Today's Tasks"
          subtitle="Due or overdue"
          right={
            <button className="btn-sm" onClick={() => navigate("tasks")}>
              All tasks
            </button>
          }
        >
          {d.todaysTasks.length === 0 ? (
            <p className="py-6 text-center text-xs text-faint">
              Nothing due today — nice work
            </p>
          ) : (
            <div className="space-y-2">
              {d.todaysTasks.map((t) => {
                const eff = effectiveTaskStatus(t);
                return (
                  <div
                    key={t.id}
                    className="neu-inset-sm flex items-center gap-3 rounded-xl p-2.5"
                  >
                    <button
                      className="icon-btn h-7 w-7 shrink-0"
                      title="Mark complete"
                      onClick={() => {
                        updateTask(t.id, { status: "Completed" });
                        pushToast("Task completed");
                      }}
                    >
                      <Icon name="check" size={14} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-ink">
                        {t.title}
                      </div>
                      <div className="text-[10px] font-semibold text-faint">
                        {lk.userName(t.assigneeId)}
                        {t.matterId ? ` · ${lk.matterName(t.matterId)}` : ""}
                      </div>
                    </div>
                    <Badge tone={eff === "Overdue" ? "bad" : "warn"}>{eff}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Upcoming consultations */}
        <Section
          title="Upcoming Consultations"
          subtitle="Next scheduled"
          right={
            <button className="btn-sm" onClick={() => navigate("calendar")}>
              Calendar
            </button>
          }
        >
          {d.upcomingConsults.length === 0 ? (
            <p className="py-6 text-center text-xs text-faint">
              No consultations scheduled
            </p>
          ) : (
            <div className="space-y-2.5">
              {d.upcomingConsults.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate("calendar")}
                  className="neu-inset-sm flex w-full items-center gap-3 rounded-xl p-3 text-left transition-shadow hover:shadow-neu-xs"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-white shadow-neu-xs"
                    style={{ background: EVENT_COLORS.Consultation }}
                  >
                    <span className="text-[13px] font-extrabold leading-none">
                      {a.date.slice(8, 10)}
                    </span>
                    <span className="text-[8px] font-bold uppercase">
                      {new Date(a.date + "T12:00").toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-ink">
                      {a.title}
                    </span>
                    <span className="text-[10px] font-semibold text-faint">
                      {fmtTime(a.startTime)} · {a.location ?? "TBD"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* Upcoming deadlines */}
        <Section title="Upcoming Deadlines" subtitle="Court & filing dates">
          {d.deadlines.length === 0 ? (
            <p className="py-6 text-center text-xs text-faint">No deadlines near</p>
          ) : (
            <div className="space-y-2.5">
              {d.deadlines.map((dl) => {
                const du = daysUntil(dl.date);
                return (
                  <button
                    key={dl.id}
                    onClick={() => navigate(dl.view, dl.ref)}
                    className="neu-inset-sm flex w-full items-center gap-3 rounded-xl p-3 text-left transition-shadow hover:shadow-neu-xs"
                  >
                    <span
                      className="timeline-dot"
                      style={{ color: dl.color }}
                    >
                      <Icon name="clock" size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-ink">
                        {dl.title}
                      </span>
                      <span className="text-[10px] font-semibold text-faint">
                        {dl.sub}
                      </span>
                    </span>
                    <Badge tone={du <= 0 ? "bad" : du <= 3 ? "warn" : "neutral"}>
                      {du < 0 ? "Overdue" : du === 0 ? "Today" : `${du}d`}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {/* Recent activity */}
        <Section
          className="xl:col-span-3"
          title="Recent Activity"
          subtitle="Firm-wide audit-friendly activity stream"
        >
          <Timeline items={d.activity} renderTime={(iso) => timeAgo(iso)} />
        </Section>
      </div>

      {/* Quick links footer cards */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: "clipboard",
            title: "Intake pipeline",
            body: `${db.intakeSubmissions.filter((s) => s.status === "New").length} new form submissions awaiting review`,
            view: "intake",
          },
          {
            icon: "sign",
            title: "Retainers in motion",
            body: `${db.retainers.filter((r) => !["Signed"].includes(r.status)).length} retainers awaiting signature`,
            view: "retainers",
          },
          {
            icon: "shield",
            title: "Run a conflict check",
            body: "Search clients, opposing parties and related contacts before engagement",
            view: "conflict",
          },
        ].map((c) => (
          <Card
            key={c.title}
            onClick={() => navigate(c.view)}
            className="flex items-center gap-4 p-4"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-accent shadow-neu-in-sm">
              <Icon name={c.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">{c.title}</span>
              <span className="block text-xs text-faint">{c.body}</span>
            </span>
            <Icon name="arrow-right" size={16} className="shrink-0 text-faint" />
          </Card>
        ))}
      </div>
    </div>
  );
}
