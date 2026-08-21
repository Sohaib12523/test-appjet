"use client";

import React, { useEffect, useState } from "react";
import { Perm, useStore } from "@/lib/store";
import { onNavigate } from "@/lib/nav";
import { Shell } from "@/components/shell";
import { Empty, Icon } from "@/components/neu";
import LoginView from "@/components/views/login";
import PortalView from "@/components/views/portal";
import DashboardView from "@/components/views/dashboard";
import LeadsView from "@/components/views/leads";
import IntakeView from "@/components/views/intake";
import ConflictView from "@/components/views/conflict";
import RetainersView from "@/components/views/retainers";
import ContactsView from "@/components/views/contacts";
import ClientsView from "@/components/views/clients";
import MattersView from "@/components/views/matters";
import CalendarView from "@/components/views/calendar";
import TasksView from "@/components/views/tasks";
import DocumentsView from "@/components/views/documents";
import CommsView from "@/components/views/comms";
import BillingView from "@/components/views/billing";
import ReportsView from "@/components/views/reports";
import AutomationsView from "@/components/views/automations";
import SettingsView from "@/components/views/settings";

const VIEW_PERM: Record<string, Perm | null> = {
  dashboard: null,
  leads: "leads.view",
  intake: "intake.view",
  conflict: "conflict.run",
  retainers: "retainers.view",
  contacts: "contacts.view",
  clients: "clients.view",
  matters: "matters.view",
  calendar: "calendar.view",
  tasks: "tasks.view",
  documents: "documents.view",
  communications: "communications.view",
  billing: "billing.view",
  reports: "reports.view",
  automations: "automations.view",
  settings: "settings.view",
};

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="neu-card flex flex-col items-center gap-4 p-10">
        <span className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-accent text-white shadow-neu-sm">
          <Icon name="scales" size={30} />
        </span>
        <div className="text-lg font-extrabold tracking-tight text-ink">
          LawFlow CRM
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-faint">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Loading your secure workspace…
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const { hydrated, user, can } = useStore();
  const [view, setView] = useState("dashboard");
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(
    () =>
      onNavigate((v, id) => {
        setView(v);
        setFocusId(id ?? null);
      }),
    []
  );

  const go = (v: string) => {
    setView(v);
    setFocusId(null);
  };

  if (!hydrated) return <Splash />;
  if (!user) return <LoginView />;
  if (user.role === "client") return <PortalView />;

  const perm = VIEW_PERM[view] ?? null;
  const allowed = !perm || can(perm);

  return (
    <Shell view={view} setView={go}>
      {!allowed ? (
        <div className="neu-card p-8">
          <Empty
            icon="lock"
            title="Restricted area"
            hint="Your role doesn't have access to this module. Contact a firm administrator to request access."
          />
        </div>
      ) : view === "dashboard" ? (
        <DashboardView />
      ) : view === "leads" ? (
        <LeadsView focusId={focusId} />
      ) : view === "intake" ? (
        <IntakeView />
      ) : view === "conflict" ? (
        <ConflictView />
      ) : view === "retainers" ? (
        <RetainersView />
      ) : view === "contacts" ? (
        <ContactsView focusId={focusId} />
      ) : view === "clients" ? (
        <ClientsView focusId={focusId} />
      ) : view === "matters" ? (
        <MattersView focusId={focusId} />
      ) : view === "calendar" ? (
        <CalendarView />
      ) : view === "tasks" ? (
        <TasksView focusId={focusId} />
      ) : view === "documents" ? (
        <DocumentsView focusId={focusId} />
      ) : view === "communications" ? (
        <CommsView />
      ) : view === "billing" ? (
        <BillingView />
      ) : view === "reports" ? (
        <ReportsView />
      ) : view === "automations" ? (
        <AutomationsView />
      ) : view === "settings" ? (
        <SettingsView />
      ) : (
        <DashboardView />
      )}
    </Shell>
  );
}
