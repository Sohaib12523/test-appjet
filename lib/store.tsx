"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity, Appointment, AuditLog, AutomationRule, Client, CommType,
  Communication, Contact, DB, DocFile, IntakeForm, IntakeSubmission,
  Invoice, Lead, Matter, Note, NotificationItem, Retainer, Role, TaskItem,
  User, LeadStatus, RetainerStatus,
} from "./types";
import { seed } from "./data";
import { addDaysISO, nowISO, uid } from "./utils";

export type Perm =
  | "leads.view" | "leads.edit" | "intake.view" | "intake.edit"
  | "contacts.view" | "clients.view" | "matters.view" | "matters.edit"
  | "calendar.view" | "tasks.view" | "documents.view" | "communications.view"
  | "billing.view" | "billing.edit" | "reports.view" | "automations.view"
  | "automations.edit" | "settings.view" | "settings.edit" | "conflict.run"
  | "retainers.view" | "retainers.manage" | "portal";

const ALL: Perm[] = [
  "leads.view","leads.edit","intake.view","intake.edit","contacts.view",
  "clients.view","matters.view","matters.edit","calendar.view","tasks.view",
  "documents.view","communications.view","billing.view","billing.edit",
  "reports.view","automations.view","automations.edit","settings.view",
  "settings.edit","conflict.run","retainers.view","retainers.manage",
];

const PERMS: Record<Role, Perm[]> = {
  super_admin: [...ALL, "portal"],
  attorney: ALL.filter((p) => p !== "settings.edit" && p !== "automations.edit"),
  paralegal: ["leads.view","contacts.view","clients.view","matters.view","calendar.view","tasks.view","documents.view","communications.view","conflict.run","retainers.view","reports.view"],
  intake_manager: ["leads.view","leads.edit","intake.view","intake.edit","contacts.view","clients.view","calendar.view","tasks.view","documents.view","communications.view","conflict.run","retainers.view","retainers.manage"],
  receptionist: ["leads.view","leads.edit","contacts.view","calendar.view","tasks.view","communications.view"],
  client: ["portal"],
};

export interface Toast {
  id: string;
  msg: string;
  kind: "ok" | "err";
}

interface StoreShape {
  hydrated: boolean;
  db: DB;
  user: User | null;
  toasts: Toast[];
  login: (userId: string) => void;
  logout: () => void;
  registerClient: (name: string, email: string) => void;
  resetDemo: () => void;
  can: (p: Perm) => boolean;
  pushToast: (msg: string, kind?: "ok" | "err") => void;
  dismissToast: (id: string) => void;
  notify: (text: string, kind: string, userId?: string) => void;
  logAudit: (action: string, entity: string, detail: string) => void;
  addActivity: (text: string, ref?: Partial<Pick<Activity, "leadId" | "matterId" | "clientId">>) => void;
  // CRUD
  addLead: (l: Omit<Lead, "id" | "createdAt" | "lastContactAt" | "status"> & { status?: LeadStatus }) => string;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  setLeadStatus: (id: string, s: LeadStatus) => void;
  addTask: (t: Omit<TaskItem, "id" | "createdAt" | "status"> & { status?: TaskItem["status"] }) => void;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  addAppointment: (a: Omit<Appointment, "id">) => void;
  addComm: (c: { type: CommType; direction: Communication["direction"]; toName: string; subject?: string; body: string; leadId?: string; clientId?: string; matterId?: string }) => void;
  addNote: (body: string, ref: Partial<Pick<Note, "leadId" | "matterId" | "clientId">>) => void;
  addDoc: (d: Omit<DocFile, "id" | "uploadedAt" | "uploadedById" | "versions">) => void;
  updateDoc: (id: string, patch: Partial<DocFile>) => void;
  deleteDoc: (id: string) => void;
  addDocVersion: (id: string, note?: string) => void;
  addRetainer: (r: { leadId: string; title: string; amount: number; feeStructure: string }) => void;
  setRetainerStatus: (id: string, s: RetainerStatus) => void;
  convertLead: (leadId: string) => { clientId: string; matterId: string } | null;
  addInvoice: (inv: { clientId: string; matterId?: string; items: { desc: string; amount: number }[]; dueInDays: number }) => void;
  recordPayment: (invoiceId: string, amount: number, method: Invoice["payments"][number]["method"]) => void;
  addTimeEntry: (t: Omit<import("./types").TimeEntry, "id" | "userId" | "invoiced">) => void;
  addExpense: (e: Omit<import("./types").Expense, "id">) => void;
  addContact: (c: Omit<Contact, "id">) => void;
  updateMatter: (id: string, patch: Partial<Matter>) => void;
  markAllNotifsRead: () => void;
  markNotifRead: (id: string) => void;
  toggleAutomation: (id: string) => void;
  saveIntakeForm: (form: IntakeForm) => void;
  deleteIntakeForm: (id: string) => void;
  submitIntake: (formId: string, data: Record<string, string>) => void;
  processSubmission: (id: string) => void;
  runConflictCheck: (query: string) => import("./types").ConflictCheck;
  updateUser: (id: string, patch: Partial<User>) => void;
}

const StoreCtx = createContext<StoreShape | null>(null);

const DB_KEY = "lawflow.db.v1";
const SESSION_KEY = "lawflow.session.v1";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => seed());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DB_KEY);
      if (raw) setDb(JSON.parse(raw));
      const sess = window.localStorage.getItem(SESSION_KEY);
      if (sess) setSessionId(sess);
    } catch {}
    loaded.current = true;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch {}
  }, [db]);

  const user = useMemo(
    () => db.users.find((u) => u.id === sessionId) ?? null,
    [db.users, sessionId]
  );

  const mutate = useCallback((fn: (d: DB) => DB) => setDb((prev) => fn(prev)), []);

  const pushToast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = uid("toast");
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const logAudit = useCallback(
    (action: string, entity: string, detail: string) => {
      mutate((d) => ({
        ...d,
        auditLogs: [
          { id: uid("al"), at: nowISO(), userId: sessionId ?? "system", action, entity, detail },
          ...d.auditLogs,
        ].slice(0, 200),
      }));
    },
    [mutate, sessionId]
  );

  const notify = useCallback(
    (text: string, kind: string, userId?: string) => {
      mutate((d) => ({
        ...d,
        notifications: [
          { id: uid("nt"), at: nowISO(), text, kind, read: false, userId },
          ...d.notifications,
        ].slice(0, 100),
      }));
    },
    [mutate]
  );

  const addActivity = useCallback(
    (text: string, ref?: Partial<Pick<Activity, "leadId" | "matterId" | "clientId">>) => {
      const actor = user?.name ?? "System";
      mutate((d) => ({
        ...d,
        activities: [
          { id: uid("ac"), at: nowISO(), actor, text, ...ref },
          ...d.activities,
        ].slice(0, 300),
      }));
    },
    [mutate, user]
  );

  const can = useCallback(
    (p: Perm) => (user ? PERMS[user.role].includes(p) : false),
    [user]
  );

  const login = useCallback(
    (userId: string) => {
      setSessionId(userId);
      try {
        window.localStorage.setItem(SESSION_KEY, userId);
      } catch {}
      mutate((d) => ({
        ...d,
        users: d.users.map((u) => (u.id === userId ? { ...u, lastActive: nowISO() } : u)),
      }));
    },
    [mutate]
  );

  const logout = useCallback(() => {
    setSessionId(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, []);

  const registerClient = useCallback(
    (name: string, email: string) => {
      const id = uid("u");
      mutate((d) => ({
        ...d,
        users: [
          ...d.users,
          { id, name, email, role: "client", title: "Client", color: "#0e9bb5", hourlyRate: 0, twoFactorEnabled: false, lastActive: nowISO() },
        ],
      }));
      login(id);
    },
    [login, mutate]
  );

  const resetDemo = useCallback(() => {
    const fresh = seed();
    setDb(fresh);
    try {
      window.localStorage.setItem(DB_KEY, JSON.stringify(fresh));
      window.localStorage.removeItem(SESSION_KEY);
    } catch {}
    setSessionId(null);
  }, []);

  function makeTask(
    d: DB,
    t: Omit<TaskItem, "id" | "createdAt" | "status"> & { status?: TaskItem["status"] }
  ): TaskItem {
    return {
      id: uid("t"),
      createdAt: nowISO(),
      status: t.status ?? "To Do",
      ...t,
    };
  }

  // Automation engine: runs side effects for active rules matching a trigger
  const fireAutomations = useCallback(
    (d: DB, trigger: string, ctx: { leadId?: string; matterId?: string }): DB => {
      let out = d;
      for (const rule of d.automations) {
        if (!rule.active || rule.trigger !== trigger) continue;
        out = {
          ...out,
          automations: out.automations.map((a) => (a.id === rule.id ? { ...a, runs: a.runs + 1 } : a)),
        };
        const lead = ctx.leadId ? out.leads.find((l) => l.id === ctx.leadId) : undefined;
        for (const action of rule.actions) {
          if (action.startsWith("Assign intake manager") && lead) {
            out = { ...out, leads: out.leads.map((l) => (l.id === lead.id ? { ...l, intakeManagerId: "u5" } : l)) };
          } else if (action.startsWith("Create follow-up task") && lead) {
            const t = makeTask(out, {
              title: `Follow up — ${lead.firstName} ${lead.lastName} (${lead.caseType})`,
              assigneeId: lead.assignedAttorneyId,
              leadId: lead.id,
              priority: lead.priority,
              dueDate: addDaysISO(1),
              notes: "Auto-created by automation: " + rule.name,
            });
            out = { ...out, tasks: [t, ...out.tasks] };
          } else if (action.startsWith("Send notification") || action.startsWith("Notify")) {
            const nt: NotificationItem = {
              id: uid("nt"), at: nowISO(), kind: "Automation", read: false,
              text: `${rule.name}: ${action.replace(/^(Send notification to|Notify)\s*/i, "")}${lead ? ` — ${lead.firstName} ${lead.lastName}` : ""}`,
            };
            out = { ...out, notifications: [nt, ...out.notifications].slice(0, 100) };
          }
        }
      }
      return out;
    },
    []
  );

  const addLead: StoreShape["addLead"] = useCallback(
    (l) => {
      const id = uid("l");
      mutate((d) => {
        const lead: Lead = {
          ...l,
          id,
          status: l.status ?? "New Lead",
          createdAt: nowISO(),
          lastContactAt: nowISO(),
        };
        let next: DB = { ...d, leads: [lead, ...d.leads] };
        next = fireAutomations(next, "When a new lead is created", { leadId: id });
        const nt: NotificationItem = {
          id: uid("nt"), at: nowISO(), kind: "New Lead", read: false,
          text: `New lead: ${lead.firstName} ${lead.lastName} (${lead.practiceArea} — ${lead.caseType})`,
        };
        next = { ...next, notifications: [nt, ...next.notifications] };
        return next;
      });
      addActivity(`Created lead ${l.firstName} ${l.lastName}`, { leadId: id });
      logAudit("CREATE", "lead", `New lead ${l.firstName} ${l.lastName} (${l.practiceArea})`);
      return id;
    },
    [mutate, fireAutomations, addActivity, logAudit]
  );

  const updateLead = useCallback(
    (id: string, patch: Partial<Lead>) => {
      mutate((d) => ({ ...d, leads: d.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    },
    [mutate]
  );

  const setLeadStatus = useCallback(
    (id: string, s: LeadStatus) => {
      mutate((d) => ({ ...d, leads: d.leads.map((l) => (l.id === id ? { ...l, status: s, lastContactAt: nowISO() } : l)) }));
      const lead = db.leads.find((l) => l.id === id);
      if (lead) {
        addActivity(`Status changed to "${s}"`, { leadId: id });
        logAudit("UPDATE", "lead", `${lead.firstName} ${lead.lastName} status → ${s}`);
        if (s === "Consultation Completed") {
          mutate((d) => fireAutomations(d, "When a consultation is completed", { leadId: id }));
        }
      }
    },
    [mutate, db.leads, addActivity, logAudit]
  );

  const addTask: StoreShape["addTask"] = useCallback(
    (t) => {
      mutate((d) => ({ ...d, tasks: [makeTask(d, t), ...d.tasks] }));
      notify(`Task assigned: ${t.title}`, "Task Assigned", t.assigneeId);
      logAudit("CREATE", "task", `Task created: ${t.title}`);
    },
    [mutate, notify, logAudit]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<TaskItem>) => {
      mutate((d) => {
        const before = d.tasks.find((t) => t.id === id);
        let next: DB = { ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
        if (before && patch.status && patch.status !== "Completed" && before.dueDate < addDaysISO(0)) {
          next = fireAutomations(next, "When a task becomes overdue", {});
        }
        return next;
      });
    },
    [mutate, fireAutomations]
  );

  const addAppointment: StoreShape["addAppointment"] = useCallback(
    (a) => {
      mutate((d) => {
        let next: DB = { ...d, appointments: [...d.appointments, { ...a, id: uid("a") }] };
        if (a.type === "Consultation") next = fireAutomations(next, "When a consultation is booked", { leadId: a.leadId });
        return next;
      });
      logAudit("CREATE", "appointment", `Scheduled: ${a.title}`);
    },
    [mutate, fireAutomations, logAudit]
  );

  const addComm: StoreShape["addComm"] = useCallback(
    (c) => {
      mutate((d) => ({
        ...d,
        communications: [
          {
            id: uid("cm"), fromName: user?.name ?? "System", at: nowISO(),
            ...c,
          },
          ...d.communications,
        ],
      }));
      if (c.leadId) mutate((d) => ({ ...d, leads: d.leads.map((l) => (l.id === c.leadId ? { ...l, lastContactAt: nowISO() } : l)) }));
      addActivity(`Logged ${c.type.toLowerCase()} ${c.direction === "Outbound" ? "to " + c.toName : ""}`, { leadId: c.leadId, matterId: c.matterId, clientId: c.clientId });
      logAudit("SEND", "communication", `${c.type} — ${c.subject ?? c.toName}`);
    },
    [mutate, user, addActivity, logAudit]
  );

  const addNote: StoreShape["addNote"] = useCallback(
    (body, ref) => {
      mutate((d) => ({
        ...d,
        notes: [{ id: uid("n"), body, at: nowISO(), authorId: user?.id ?? "system", ...ref }, ...d.notes],
      }));
    },
    [mutate, user]
  );

  const addDoc: StoreShape["addDoc"] = useCallback(
    (doc) => {
      mutate((d) => ({
        ...d,
        documents: [
          { ...doc, id: uid("d"), uploadedAt: nowISO(), uploadedById: user?.id ?? "u1", versions: [{ v: 1, at: nowISO(), byId: user?.id ?? "u1" }] },
          ...d.documents,
        ],
      }));
      notify(`Document uploaded: ${doc.name}`, "Document Uploaded");
      addActivity(`Uploaded document ${doc.name}`, { matterId: doc.matterId, leadId: doc.leadId, clientId: doc.clientId });
      logAudit("UPLOAD", "document", doc.name);
    },
    [mutate, user, notify, addActivity, logAudit]
  );

  const updateDoc = useCallback((id: string, patch: Partial<DocFile>) => {
    mutate((d) => ({ ...d, documents: d.documents.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }, [mutate]);

  const deleteDoc = useCallback(
    (id: string) => {
      const doc = db.documents.find((x) => x.id === id);
      mutate((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== id) }));
      if (doc) logAudit("DELETE", "document", doc.name);
    },
    [mutate, db.documents, logAudit]
  );

  const addDocVersion = useCallback(
    (id: string, note?: string) => {
      mutate((d) => ({
        ...d,
        documents: d.documents.map((x) =>
          x.id === id
            ? { ...x, versions: [...x.versions, { v: x.versions.length + 1, at: nowISO(), byId: user?.id ?? "u1", note }] }
            : x
        ),
      }));
      logAudit("UPDATE", "document", "New version uploaded");
    },
    [mutate, user, logAudit]
  );

  const addRetainer: StoreShape["addRetainer"] = useCallback(
    (r) => {
      mutate((d) => ({
        ...d,
        retainers: [{ ...r, id: uid("r"), status: "Draft", createdAt: nowISO() }, ...d.retainers],
      }));
      logAudit("CREATE", "retainer", r.title);
    },
    [mutate, logAudit]
  );

  const setRetainerStatus = useCallback(
    (id: string, s: RetainerStatus) => {
      mutate((d) => {
        const r = d.retainers.find((x) => x.id === id);
        if (!r) return d;
        const patch: Partial<Retainer> = { status: s };
        if (s === "Sent" || s === "Pending Signature") patch.sentAt = r.sentAt ?? nowISO();
        if (s === "Viewed") patch.viewedAt = nowISO();
        if (s === "Signed") patch.signedAt = nowISO();
        let next: DB = {
          ...d,
          retainers: d.retainers.map((x) => (x.id === id ? { ...x, ...patch } : x)),
          leads: s === "Sent" || s === "Pending Signature"
            ? d.leads.map((l) => (l.id === r.leadId && l.status !== "Converted" ? { ...l, status: "Retainer Sent" } : l))
            : s === "Signed"
            ? d.leads.map((l) => (l.id === r.leadId && l.status !== "Converted" ? { ...l, status: "Retainer Signed" } : l))
            : d.leads,
        };
        if (s === "Signed") {
          const lead = next.leads.find((l) => l.id === r.leadId);
          const nt: NotificationItem = {
            id: uid("nt"), at: nowISO(), kind: "Retainer Signed", read: false,
            text: `Retainer signed: ${lead ? lead.firstName + " " + lead.lastName : r.title} — ready to convert to client`,
          };
          next = { ...next, notifications: [nt, ...next.notifications] };
          next = fireAutomations(next, "When a retainer is signed", { leadId: r.leadId });
        }
        return next;
      });
      logAudit("UPDATE", "retainer", `Retainer status → ${s}`);
    },
    [mutate, fireAutomations, logAudit]
  );

  const convertLead: StoreShape["convertLead"] = useCallback(
    (leadId) => {
      const lead = db.leads.find((l) => l.id === leadId);
      if (!lead || lead.status === "Converted") return null;
      const clientId = uid("c");
      const matterId = uid("m");
      const num = `NEW-${new Date().getFullYear()}-${String(db.seq.matter).padStart(4, "0")}`;
      mutate((d) => {
        const client: Client = {
          id: clientId,
          name: `${lead.firstName} ${lead.lastName}`,
          email: lead.email, phone: lead.phone,
          leadId: lead.id, practiceArea: lead.practiceArea,
          attorneyId: lead.assignedAttorneyId, since: nowISO(), status: "Active",
        };
        const matter: Matter = {
          id: matterId,
          name: `${lead.lastName} — ${lead.caseType}`,
          number: num,
          clientId, practiceArea: lead.practiceArea,
          attorneyId: lead.assignedAttorneyId,
          status: "New", priority: lead.priority,
          openDate: addDaysISO(0), caseValue: lead.estimatedValue,
          description: lead.description,
        };
        const portalUser: User = {
          id: uid("u"), name: client.name, email: lead.email, role: "client",
          title: "Client", color: "#0e9bb5", hourlyRate: 0, clientId,
          twoFactorEnabled: false, lastActive: nowISO(),
        };
        const activity: Activity = {
          id: uid("ac"), at: nowISO(), actor: user?.name ?? "System",
          text: `Converted lead to client — matter ${num} opened`, leadId, clientId, matterId,
        };
        return {
          ...d,
          clients: [client, ...d.clients],
          matters: [matter, ...d.matters],
          users: [...d.users, portalUser],
          leads: d.leads.map((l) => (l.id === leadId ? { ...l, status: "Converted" as LeadStatus } : l)),
          activities: [activity, ...d.activities],
          seq: { ...d.seq, matter: d.seq.matter + 1 },
        };
      });
      notify(`Lead converted: ${lead.firstName} ${lead.lastName} — matter ${num} created`, "Converted");
      logAudit("CONVERT", "lead", `${lead.firstName} ${lead.lastName} → client + matter ${num}`);
      return { clientId, matterId };
    },
    [db.leads, db.seq.matter, mutate, user, notify, logAudit]
  );

  const addInvoice: StoreShape["addInvoice"] = useCallback(
    ({ clientId, matterId, items, dueInDays }) => {
      mutate((d) => {
        const inv: Invoice = {
          id: uid("inv"),
          number: `INV-${new Date().getFullYear()}-${String(d.seq.invoice).padStart(4, "0")}`,
          clientId, matterId, items,
          issueDate: addDaysISO(0), dueDate: addDaysISO(dueInDays),
          status: "Sent", payments: [],
        };
        return { ...d, invoices: [inv, ...d.invoices], seq: { ...d.seq, invoice: d.seq.invoice + 1 } };
      });
      logAudit("CREATE", "invoice", "Invoice issued");
    },
    [mutate, logAudit]
  );

  const recordPayment: StoreShape["recordPayment"] = useCallback(
    (invoiceId, amount, method) => {
      mutate((d) => ({
        ...d,
        invoices: d.invoices.map((inv) => {
          if (inv.id !== invoiceId) return inv;
          const payments = [...inv.payments, { id: uid("p"), invoiceId, date: addDaysISO(0), amount, method }];
          const total = inv.items.reduce((s, i) => s + i.amount, 0);
          const paid = payments.reduce((s, p) => s + p.amount, 0);
          return { ...inv, payments, status: paid >= total ? "Paid" : "Partial" };
        }),
      }));
      notify(`Payment recorded: $${amount.toLocaleString()}`, "Payment");
      logAudit("PAYMENT", "invoice", `Payment of $${amount} recorded`);
    },
    [mutate, notify, logAudit]
  );

  const addTimeEntry: StoreShape["addTimeEntry"] = useCallback(
    (t) => {
      mutate((d) => ({ ...d, timeEntries: [{ ...t, id: uid("te"), userId: user?.id ?? "u2", invoiced: false }, ...d.timeEntries] }));
    },
    [mutate, user]
  );

  const addExpense: StoreShape["addExpense"] = useCallback(
    (e) => {
      mutate((d) => ({ ...d, expenses: [{ ...e, id: uid("ex") }, ...d.expenses] }));
    },
    [mutate]
  );

  const addContact: StoreShape["addContact"] = useCallback(
    (c) => {
      mutate((d) => ({ ...d, contacts: [{ ...c, id: uid("k") }, ...d.contacts] }));
      logAudit("CREATE", "contact", c.name);
    },
    [mutate, logAudit]
  );

  const updateMatter = useCallback((id: string, patch: Partial<Matter>) => {
    mutate((d) => ({ ...d, matters: d.matters.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, [mutate]);

  const markAllNotifsRead = useCallback(() => {
    mutate((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }));
  }, [mutate]);

  const markNotifRead = useCallback((id: string) => {
    mutate((d) => ({ ...d, notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }, [mutate]);

  const toggleAutomation = useCallback((id: string) => {
    mutate((d) => ({ ...d, automations: d.automations.map((a) => (a.id === id ? { ...a, active: !a.active } : a)) }));
  }, [mutate]);

  const saveIntakeForm = useCallback(
    (form: IntakeForm) => {
      mutate((d) => {
        const exists = d.intakeForms.some((f) => f.id === form.id);
        return {
          ...d,
          intakeForms: exists
            ? d.intakeForms.map((f) => (f.id === form.id ? form : f))
            : [...d.intakeForms, form],
        };
      });
      logAudit("SAVE", "intake_form", form.name);
    },
    [mutate, logAudit]
  );

  const deleteIntakeForm = useCallback((id: string) => {
    mutate((d) => ({ ...d, intakeForms: d.intakeForms.filter((f) => f.id !== id) }));
  }, [mutate]);

  const submitIntake = useCallback(
    (formId: string, data: Record<string, string>) => {
      mutate((d) => {
        const sub: IntakeSubmission = { id: uid("is"), formId, submittedAt: nowISO(), data, status: "New" };
        return {
          ...d,
          intakeSubmissions: [sub, ...d.intakeSubmissions],
          intakeForms: d.intakeForms.map((f) => (f.id === formId ? { ...f, submissions: f.submissions + 1 } : f)),
        };
      });
      notify("New intake form submission received", "Intake");
    },
    [mutate, notify]
  );

  const processSubmission = useCallback(
    (id: string) => {
      const sub = db.intakeSubmissions.find((s) => s.id === id);
      if (!sub || sub.status === "Processed") return;
      const form = db.intakeForms.find((f) => f.id === sub.formId);
      if (!form) return;
      const full = data_get(sub.data, "Full name");
      const parts = full.split(" ");
      const leadId = addLead({
        firstName: parts[0] ?? full,
        lastName: parts.slice(1).join(" ") || "—",
        email: data_get(sub.data, "Email"),
        phone: data_get(sub.data, "Phone"),
        practiceArea: form.practiceArea,
        caseType: data_get(sub.data, "Type of accident") || data_get(sub.data, "Matter type") || data_get(sub.data, "Case type") || data_get(sub.data, "Issue type") || "General",
        description: Object.entries(sub.data).map(([k, v]) => `${k}: ${v}`).join("\n"),
        source: "Website Form",
        assignedAttorneyId: "u2",
        intakeManagerId: "u5",
        priority: "Medium",
        estimatedValue: 0,
      });
      mutate((d) => ({
        ...d,
        intakeSubmissions: d.intakeSubmissions.map((s) => (s.id === id ? { ...s, status: "Processed", leadId } : s)),
      }));
    },
    [db.intakeSubmissions, db.intakeForms, addLead, mutate]
  );

  const runConflictCheck: StoreShape["runConflictCheck"] = useCallback(
    (query) => {
      const q = query.trim().toLowerCase();
      const matches: import("./types").ConflictMatch[] = [];
      if (q.length >= 2) {
        for (const l of db.leads) {
          const name = `${l.firstName} ${l.lastName}`;
          if (name.toLowerCase().includes(q))
            matches.push({ kind: "Lead", id: l.id, name, context: `${l.status} — ${l.practiceArea}, ${l.caseType}` });
        }
        for (const c of db.clients) {
          if (c.name.toLowerCase().includes(q))
            matches.push({ kind: "Client", id: c.id, name: c.name, context: `${c.status} client — ${c.practiceArea}` });
        }
        for (const m of db.matters) {
          if (m.name.toLowerCase().includes(q))
            matches.push({ kind: "Matter", id: m.id, name: m.name, context: `${m.number} — ${m.status}` });
          if (m.opposingParty && m.opposingParty.toLowerCase().includes(q))
            matches.push({ kind: "Opposing Party", id: m.id, name: m.opposingParty, context: `Opposing party in ${m.name} (${m.number})` });
        }
        for (const k of db.contacts) {
          if (k.name.toLowerCase().includes(q) || (k.company ?? "").toLowerCase().includes(q))
            matches.push({ kind: "Contact", id: k.id, name: k.name, context: `${k.type}${k.company ? " — " + k.company : ""}` });
        }
      }
      const check = { id: uid("cc"), at: nowISO(), byId: user?.id ?? "u1", query, matches };
      mutate((d) => ({ ...d, conflictChecks: [check, ...d.conflictChecks].slice(0, 50) }));
      logAudit("CHECK", "conflict", `Conflict check: "${query}" — ${matches.length} match(es)`);
      return check;
    },
    [db, user, mutate, logAudit]
  );

  const updateUser = useCallback((id: string, patch: Partial<User>) => {
    mutate((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
  }, [mutate]);

  const value: StoreShape = {
    hydrated, db, user, toasts,
    login, logout, registerClient, resetDemo, can,
    pushToast, dismissToast, notify, logAudit, addActivity,
    addLead, updateLead, setLeadStatus, addTask, updateTask, addAppointment,
    addComm, addNote, addDoc, updateDoc, deleteDoc, addDocVersion,
    addRetainer, setRetainerStatus, convertLead, addInvoice, recordPayment,
    addTimeEntry, addExpense, addContact, updateMatter,
    markAllNotifsRead, markNotifRead, toggleAutomation,
    saveIntakeForm, deleteIntakeForm, submitIntake, processSubmission,
    runConflictCheck, updateUser,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function data_get(data: Record<string, string>, key: string): string {
  return data[key] ?? "";
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
