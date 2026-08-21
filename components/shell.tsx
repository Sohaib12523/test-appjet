"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Perm, useStore } from "@/lib/store";
import { Avatar, Badge, Icon } from "@/components/neu";
import { cn, timeAgo } from "@/lib/utils";
import { navigate } from "@/lib/nav";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  perm: Perm | null;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Main",
    items: [{ id: "dashboard", label: "Dashboard", icon: "grid", perm: null }],
  },
  {
    group: "Grow",
    items: [
      { id: "leads", label: "Leads", icon: "users", perm: "leads.view" },
      { id: "intake", label: "Intake", icon: "clipboard", perm: "intake.view" },
      { id: "conflict", label: "Conflict Check", icon: "shield", perm: "conflict.run" },
      { id: "retainers", label: "Retainers", icon: "sign", perm: "retainers.view" },
    ],
  },
  {
    group: "People",
    items: [
      { id: "contacts", label: "Contacts", icon: "book", perm: "contacts.view" },
      { id: "clients", label: "Clients", icon: "user-check", perm: "clients.view" },
    ],
  },
  {
    group: "Work",
    items: [
      { id: "matters", label: "Matters", icon: "briefcase", perm: "matters.view" },
      { id: "calendar", label: "Calendar", icon: "calendar", perm: "calendar.view" },
      { id: "tasks", label: "Tasks", icon: "check-square", perm: "tasks.view" },
      { id: "documents", label: "Documents", icon: "folder", perm: "documents.view" },
      { id: "communications", label: "Communications", icon: "message", perm: "communications.view" },
    ],
  },
  {
    group: "Firm",
    items: [
      { id: "billing", label: "Billing", icon: "card", perm: "billing.view" },
      { id: "reports", label: "Reports", icon: "chart", perm: "reports.view" },
      { id: "automations", label: "Automations", icon: "bolt", perm: "automations.view" },
      { id: "settings", label: "Settings", icon: "gear", perm: "settings.view" },
    ],
  },
];

const VIEW_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  intake: "Client Intake",
  conflict: "Conflict Check",
  retainers: "Retainers & E-Signature",
  contacts: "Contacts",
  clients: "Clients",
  matters: "Matters",
  calendar: "Calendar",
  tasks: "Tasks",
  documents: "Documents",
  communications: "Communications",
  billing: "Billing",
  reports: "Reports",
  automations: "Automations",
  settings: "Settings",
};

const NOTIF_ICON: Record<string, string> = {
  "New Lead": "users",
  "New Message": "mail",
  "Task Assigned": "check-square",
  "Task Overdue": "alert",
  "Task Due": "clock",
  "Document Uploaded": "file",
  "Retainer Signed": "sign",
  Deadline: "calendar",
  Consultation: "calendar",
  Automation: "bolt",
  Payment: "money",
  Converted: "user-check",
  Intake: "clipboard",
};

export function Shell({
  view,
  setView,
  children,
}: {
  view: string;
  setView: (v: string) => void;
  children: React.ReactNode;
}) {
  const { user, can, logout, db, markAllNotifsRead, markNotifRead, toasts, dismissToast } =
    useStore();
  const [sideOpen, setSideOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const myNotifs = useMemo(
    () =>
      db.notifications
        .filter((n) => !n.userId || n.userId === user?.id)
        .slice(0, 30),
    [db.notifications, user]
  );
  const unread = myNotifs.filter((n) => !n.read).length;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (!notifOpen && !userOpen) return;
    const h = (e: MouseEvent) => {
      if (!notifRef.current?.contains(e.target as Node)) setNotifOpen(false);
      if (!userRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [notifOpen, userOpen]);

  if (!user) return null;

  const go = (v: string) => {
    setView(v);
    setSideOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-neu-sm">
          <Icon name="scales" size={22} />
        </span>
        <div>
          <div className="text-[15px] font-extrabold tracking-tight text-ink">
            LawFlow CRM
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-faint">
            Legal Suite
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => {
          const items = g.items.filter((i) => !i.perm || can(i.perm));
          if (items.length === 0) return null;
          return (
            <div key={g.group}>
              <div className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-faint">
                {g.group}
              </div>
              <div className="space-y-1">
                {items.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => go(i.id)}
                    className={cn(
                      "nav-item w-full",
                      view === i.id && "nav-item-active"
                    )}
                  >
                    <Icon name={i.icon} size={17} />
                    {i.label}
                    {i.id === "leads" && (
                      <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {db.leads.filter((l) => l.status === "New Lead").length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3">
        <div className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
          <Avatar name={user.name} color={user.color} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-ink">{user.name}</div>
            <div className="truncate text-[10px] font-semibold text-faint">
              {user.title}
            </div>
          </div>
          <button
            className="icon-btn h-8 w-8"
            title="Sign out"
            onClick={logout}
          >
            <Icon name="logout" size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#c6ccd866] bg-base lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sideOpen && (
        <div
          className="animate-fade fixed inset-0 z-50 bg-[#1f2a4433] backdrop-blur-[2px] lg:hidden"
          onClick={() => setSideOpen(false)}
        >
          <div
            className="absolute inset-y-0 left-0 w-72 bg-base shadow-neu-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-[#c6ccd866] bg-base/90 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-3 sm:px-5">
            <button
              className="icon-btn lg:hidden"
              onClick={() => setSideOpen(true)}
              aria-label="Menu"
            >
              <Icon name="table" size={17} />
            </button>
            <h2 className="hidden text-sm font-bold text-sub sm:block">
              {VIEW_TITLES[view] ?? "Dashboard"}
            </h2>
            <div className="flex-1" />
            <button
              className="neu-inset-sm hidden items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-faint transition-colors hover:text-sub sm:flex sm:w-56 md:w-72"
              onClick={() => setSearchOpen(true)}
            >
              <Icon name="search" size={14} />
              Search leads, matters, documents…
              <span className="ml-auto rounded-md bg-base px-1.5 py-0.5 text-[10px] font-bold shadow-neu-xs">
                ⌘K
              </span>
            </button>
            <button
              className="icon-btn sm:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Icon name="search" size={17} />
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                className="icon-btn relative"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
              >
                <Icon name="bell" size={17} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="animate-up neu-card absolute right-0 top-12 z-40 flex max-h-[70vh] w-[92vw] max-w-sm flex-col p-3">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-sm font-bold">Notifications</span>
                    <button
                      className="text-xs font-semibold text-accent"
                      onClick={markAllNotifsRead}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {myNotifs.length === 0 && (
                      <p className="py-8 text-center text-xs text-faint">
                        You&apos;re all caught up
                      </p>
                    )}
                    {myNotifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markNotifRead(n.id)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors hover:bg-[#2f6bff08]",
                          !n.read && "bg-[#2f6bff0d]"
                        )}
                      >
                        <span className="timeline-dot mt-0.5 text-accent">
                          <Icon name={NOTIF_ICON[n.kind] ?? "bell"} size={14} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block text-xs leading-snug text-sub",
                              !n.read && "font-bold text-ink"
                            )}
                          >
                            {n.text}
                          </span>
                          <span className="tiny">{timeAgo(n.at)}</span>
                        </span>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User */}
            <div ref={userRef} className="relative">
              <button
                className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-shadow hover:shadow-neu-sm"
                onClick={() => setUserOpen((v) => !v)}
              >
                <Avatar name={user.name} color={user.color} size={34} />
                <span className="hidden text-left md:block">
                  <span className="block text-xs font-bold leading-tight text-ink">
                    {user.name}
                  </span>
                  <span className="block text-[10px] font-semibold leading-tight text-faint">
                    {user.title}
                  </span>
                </span>
                <Icon name="chevron-down" size={14} className="hidden text-faint md:block" />
              </button>
              {userOpen && (
                <div className="animate-up neu-card absolute right-0 top-12 z-40 w-60 p-3">
                  <div className="mb-2 flex items-center gap-3 border-b border-[#c6ccd866] pb-3">
                    <Avatar name={user.name} color={user.color} size={40} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{user.name}</div>
                      <div className="truncate text-xs text-faint">{user.email}</div>
                    </div>
                  </div>
                  <div className="mb-2 px-1">
                    <Badge tone="accent">{user.title}</Badge>
                    {user.twoFactorEnabled && (
                      <span className="ml-1.5">
                        <Badge tone="ok">2FA on</Badge>
                      </span>
                    )}
                  </div>
                  <button
                    className="nav-item w-full"
                    onClick={() => {
                      setUserOpen(false);
                      go("settings");
                    }}
                  >
                    <Icon name="gear" size={15} /> Settings
                  </button>
                  <button
                    className="nav-item w-full text-bad"
                    onClick={logout}
                  >
                    <Icon name="logout" size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-[1400px] p-3 pb-24 sm:p-5 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#c6ccd866] bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {[
            { id: "dashboard", icon: "grid", label: "Home" },
            { id: "leads", icon: "users", label: "Leads" },
            { id: "matters", icon: "briefcase", label: "Matters" },
            { id: "tasks", icon: "check-square", label: "Tasks" },
          ].map((i) => (
            <button
              key={i.id}
              onClick={() => go(i.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold",
                view === i.id ? "text-accent" : "text-faint"
              )}
            >
              <Icon name={i.icon} size={19} />
              {i.label}
            </button>
          ))}
          <button
            onClick={() => setSideOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold text-faint"
          >
            <Icon name="dots" size={19} />
            More
          </button>
        </div>
      </nav>

      {/* Global search */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-20 right-3 z-[60] flex w-[calc(100vw-24px)] max-w-sm flex-col gap-2 lg:bottom-6 lg:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-up neu-card pointer-events-auto flex items-center gap-3 p-3.5"
          >
            <span
              className="timeline-dot"
              style={{ color: t.kind === "ok" ? "#2f9e77" : "#d05555" }}
            >
              <Icon name={t.kind === "ok" ? "check" : "alert"} size={15} />
            </span>
            <span className="flex-1 text-xs font-semibold text-ink">{t.msg}</span>
            <button
              className="text-faint transition-colors hover:text-ink"
              onClick={() => dismissToast(t.id)}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Global search ---------------- */

function SearchModal({ onClose }: { onClose: () => void }) {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return null;
    const has = (...parts: (string | undefined)[]) =>
      parts.some((p) => (p ?? "").toLowerCase().includes(query));
    return {
      leads: db.leads
        .filter((l) =>
          has(l.firstName, l.lastName, l.email, l.caseType, l.practiceArea)
        )
        .slice(0, 5),
      clients: db.clients
        .filter((c) => has(c.name, c.email, c.company, c.practiceArea))
        .slice(0, 5),
      contacts: db.contacts
        .filter((c) => has(c.name, c.company, c.email, c.type))
        .slice(0, 5),
      matters: db.matters
        .filter((m) => has(m.name, m.number, m.opposingParty, m.court))
        .slice(0, 5),
      documents: db.documents.filter((d) => has(d.name, d.folder)).slice(0, 5),
      tasks: db.tasks.filter((t) => has(t.title, t.notes)).slice(0, 5),
    };
  }, [q, db]);

  const go = (view: string, id: string) => {
    onClose();
    navigate(view, id);
  };

  const Group = ({
    label,
    icon,
    children,
  }: {
    label: string;
    icon: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-faint">
        <Icon name={icon} size={12} /> {label}
      </div>
      {children}
    </div>
  );

  const Row = ({
    icon,
    title,
    sub,
    onClick,
  }: {
    icon: string;
    title: string;
    sub: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[#2f6bff10]"
    >
      <span className="timeline-dot text-accent">
        <Icon name={icon} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-ink">
          {title}
        </span>
        <span className="block truncate text-[11px] text-faint">{sub}</span>
      </span>
      <Icon name="arrow-right" size={14} className="text-faint" />
    </button>
  );

  const empty =
    results &&
    Object.values(results).every((r) => (r as unknown[]).length === 0);

  return (
    <div
      className="animate-fade fixed inset-0 z-[70] bg-[#1f2a4433] p-3 backdrop-blur-[2px] sm:p-6"
      onClick={onClose}
    >
      <div
        className="animate-up neu-card mx-auto mt-[8vh] max-h-[75vh] w-full max-w-xl overflow-hidden p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="neu-inset-sm mb-2 flex items-center gap-2.5 rounded-xl px-3.5">
          <Icon name="search" size={16} className="shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads, clients, matters, documents, tasks…"
            className="w-full bg-transparent py-3 text-sm font-semibold text-ink outline-none placeholder:text-faint"
          />
          <kbd className="rounded-md bg-base px-1.5 py-0.5 text-[10px] font-bold text-faint shadow-neu-xs">
            ESC
          </kbd>
        </div>
        <div className="max-h-[58vh] overflow-y-auto">
          {!results && (
            <p className="py-10 text-center text-xs text-faint">
              Type at least 2 characters to search across the firm
            </p>
          )}
          {empty && (
            <p className="py-10 text-center text-xs text-faint">
              No results for &ldquo;{q}&rdquo;
            </p>
          )}
          {results && results.leads.length > 0 && (
            <Group label="Leads" icon="users">
              {results.leads.map((l) => (
                <Row
                  key={l.id}
                  icon="users"
                  title={`${l.firstName} ${l.lastName}`}
                  sub={`${l.practiceArea} — ${l.caseType} · ${l.status}`}
                  onClick={() => go("leads", l.id)}
                />
              ))}
            </Group>
          )}
          {results && results.clients.length > 0 && (
            <Group label="Clients" icon="user-check">
              {results.clients.map((c) => (
                <Row
                  key={c.id}
                  icon="user-check"
                  title={c.name}
                  sub={`${c.practiceArea} · ${c.status}`}
                  onClick={() => go("clients", c.id)}
                />
              ))}
            </Group>
          )}
          {results && results.matters.length > 0 && (
            <Group label="Matters" icon="briefcase">
              {results.matters.map((m) => (
                <Row
                  key={m.id}
                  icon="briefcase"
                  title={m.name}
                  sub={`${m.number} · ${m.status}`}
                  onClick={() => go("matters", m.id)}
                />
              ))}
            </Group>
          )}
          {results && results.contacts.length > 0 && (
            <Group label="Contacts" icon="book">
              {results.contacts.map((c) => (
                <Row
                  key={c.id}
                  icon="book"
                  title={c.name}
                  sub={`${c.type}${c.company ? " — " + c.company : ""}`}
                  onClick={() => go("contacts", c.id)}
                />
              ))}
            </Group>
          )}
          {results && results.documents.length > 0 && (
            <Group label="Documents" icon="folder">
              {results.documents.map((d) => (
                <Row
                  key={d.id}
                  icon="file"
                  title={d.name}
                  sub={d.folder}
                  onClick={() => go("documents", d.id)}
                />
              ))}
            </Group>
          )}
          {results && results.tasks.length > 0 && (
            <Group label="Tasks" icon="check-square">
              {results.tasks.map((t) => (
                <Row
                  key={t.id}
                  icon="check-square"
                  title={t.title}
                  sub={`Due ${t.dueDate} · ${t.status}`}
                  onClick={() => go("tasks", t.id)}
                />
              ))}
            </Group>
          )}
        </div>
      </div>
    </div>
  );
}
