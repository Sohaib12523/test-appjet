"use client";

import React, { useState } from "react";
import { PERMS, Perm, useStore } from "@/lib/store";
import {
  Avatar, Badge, Card, ConfirmModal, Field, Icon, Input, Section, Toggle,
} from "@/components/neu";
import { ROLE_LABELS, Role } from "@/lib/types";
import { fmtDateTime, timeAgo } from "@/lib/utils";
import { PageHead } from "./common";

const MATRIX_PERMS: { perm: Perm; label: string }[] = [
  { perm: "leads.view", label: "View leads" },
  { perm: "leads.edit", label: "Create / edit leads" },
  { perm: "intake.edit", label: "Manage intake forms" },
  { perm: "matters.view", label: "View matters" },
  { perm: "matters.edit", label: "Edit matters" },
  { perm: "documents.view", label: "Documents" },
  { perm: "billing.view", label: "View billing" },
  { perm: "billing.edit", label: "Manage billing" },
  { perm: "reports.view", label: "Reports" },
  { perm: "conflict.run", label: "Run conflict checks" },
  { perm: "retainers.manage", label: "Manage retainers" },
  { perm: "automations.edit", label: "Edit automations" },
  { perm: "settings.edit", label: "Manage firm settings" },
];

const ROLES: Role[] = ["super_admin", "attorney", "paralegal", "intake_manager", "receptionist", "client"];

const AUDIT_TONE: Record<string, "accent" | "ok" | "warn" | "bad" | "viol" | "neutral" | "ink"> = {
  CREATE: "ok",
  UPDATE: "accent",
  DELETE: "bad",
  LOGIN: "viol",
  SEND: "accent",
  UPLOAD: "ink",
  PAYMENT: "ok",
  CONVERT: "warn",
  CHECK: "neutral",
  VIEW: "neutral",
  SAVE: "accent",
};

export default function SettingsView() {
  const { db, user, can, updateUser, resetDemo, pushToast } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const [firm, setFirm] = useState({
    name: "Shah & Reyes LLP",
    address: "2700 Peachtree Rd NW, Suite 400, Atlanta, GA 30305",
    phone: "(404) 555-0300",
    email: "intake@lawflow.co",
  });
  const canEdit = can("settings.edit");

  return (
    <div>
      <PageHead title="Settings" sub="Firm profile, team access, security and audit trail" />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Firm profile */}
        <Section title="Firm Profile" subtitle="Appears on retainers, invoices and the client portal">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Firm name"><Input value={firm.name} onChange={(e) => setFirm((p) => ({ ...p, name: e.target.value }))} disabled={!canEdit} /></Field>
            <Field label="Phone"><Input value={firm.phone} onChange={(e) => setFirm((p) => ({ ...p, phone: e.target.value }))} disabled={!canEdit} /></Field>
            <div className="sm:col-span-2">
              <Field label="Address"><Input value={firm.address} onChange={(e) => setFirm((p) => ({ ...p, address: e.target.value }))} disabled={!canEdit} /></Field>
            </div>
            <Field label="Intake email"><Input value={firm.email} onChange={(e) => setFirm((p) => ({ ...p, email: e.target.value }))} disabled={!canEdit} /></Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn-primary" disabled={!canEdit} onClick={() => pushToast("Firm profile saved")}>
              Save profile
            </button>
          </div>
        </Section>

        {/* Security */}
        <Section title="Security" subtitle="Authentication, sessions and account protection">
          <div className="space-y-2.5">
            <div className="neu-inset-sm flex items-center justify-between rounded-xl p-3.5">
              <div>
                <div className="text-xs font-bold text-ink">Two-factor authentication</div>
                <div className="text-[10px] font-semibold text-faint">Authenticator app or SMS for your account</div>
              </div>
              <Toggle
                on={user?.twoFactorEnabled ?? false}
                onChange={(v) => {
                  if (user) updateUser(user.id, { twoFactorEnabled: v });
                  pushToast(v ? "2FA enabled" : "2FA disabled");
                }}
              />
            </div>
            {[
              { icon: "lock", t: "Password policy", d: "Minimum 12 chars, breached-password screening, bcrypt hashing" },
              { icon: "clock", t: "Session management", d: "Idle timeout after 30 minutes · device-level sign-out" },
              { icon: "shield", t: "Row-level authorization", d: "Every query is scoped by role — clients see only their own records" },
              { icon: "history", t: "Audit logging", d: "All creates, updates, deletes, sends and logins are recorded" },
            ].map((s) => (
              <div key={s.t} className="neu-inset-sm flex items-start gap-3 rounded-xl p-3.5">
                <span className="timeline-dot mt-0.5 text-accent"><Icon name={s.icon} size={14} /></span>
                <div>
                  <div className="text-xs font-bold text-ink">{s.t}</div>
                  <div className="text-[10px] font-semibold text-faint">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Team */}
      <Section title="Team & Roles" subtitle={`${db.users.filter((u) => u.role !== "client").length} staff members`} className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-[#c6ccd866]">
                <th className="th">Member</th>
                <th className="th">Role</th>
                <th className="th text-right">Hourly rate</th>
                <th className="th text-center">2FA</th>
                <th className="th">Last active</th>
              </tr>
            </thead>
            <tbody>
              {db.users.filter((u) => u.role !== "client").map((u) => (
                <tr key={u.id} className="border-b border-[#c6ccd833] last:border-0">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} color={u.color} size={32} />
                      <div>
                        <div className="text-xs font-bold">{u.name}</div>
                        <div className="text-[10px] font-semibold text-faint">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td"><Badge tone="accent">{ROLE_LABELS[u.role]}</Badge></td>
                  <td className="td text-right text-xs font-bold">${u.hourlyRate}/hr</td>
                  <td className="td text-center">
                    <div className="flex justify-center">
                      <Toggle
                        on={u.twoFactorEnabled}
                        onChange={(v) => { updateUser(u.id, { twoFactorEnabled: v }); pushToast(`${u.name}: 2FA ${v ? "enabled" : "disabled"}`); }}
                        disabled={!canEdit}
                      />
                    </div>
                  </td>
                  <td className="td text-xs text-sub">{timeAgo(u.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Permissions matrix */}
      <Section title="Permissions Matrix" subtitle="Role-based access control across the firm" className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-[#c6ccd866]">
                <th className="th">Capability</th>
                {ROLES.map((r) => (
                  <th key={r} className="th text-center">{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_PERMS.map(({ perm, label }) => (
                <tr key={perm} className="border-b border-[#c6ccd833] last:border-0">
                  <td className="td text-xs font-semibold">{label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="td text-center">
                      {(PERMS[r] as Perm[]).includes(perm) ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ok shadow-neu-in-sm">
                          <Icon name="check" size={11} />
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="td text-xs font-semibold">Client portal access</td>
                {ROLES.map((r) => (
                  <td key={r} className="td text-center">
                    {r === "client" ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ok shadow-neu-in-sm">
                        <Icon name="check" size={11} />
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Audit log */}
      <Section title="Audit Log" subtitle="Immutable record of sensitive actions (latest 200)" className="mt-5">
        <div className="space-y-1.5">
          {db.auditLogs.slice(0, 30).map((l) => (
            <div key={l.id} className="neu-inset-sm flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5">
              <Badge tone={AUDIT_TONE[l.action] ?? "neutral"}>{l.action}</Badge>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{l.detail}</span>
              <span className="text-[10px] font-semibold text-faint">
                {db.users.find((u) => u.id === l.userId)?.name ?? "System"} · {fmtDateTime(l.at)}
              </span>
            </div>
          ))}
          {db.auditLogs.length === 0 && (
            <p className="py-6 text-center text-xs text-faint">No audit entries yet</p>
          )}
        </div>
      </Section>

      {/* Danger zone */}
      <Card className="mt-5 border border-[#d0555533] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-bad">Reset demo workspace</div>
            <div className="text-xs text-faint">
              Restore the original demo dataset and sign out. All local changes are discarded.
            </div>
          </div>
          <button className="btn-danger" onClick={() => setResetOpen(true)}>
            <Icon name="history" size={15} /> Reset demo data
          </button>
        </div>
      </Card>

      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={resetDemo}
        title="Reset demo workspace"
        body="This restores the original sample leads, matters and billing data, and signs you out. This cannot be undone."
        confirmLabel="Reset everything"
        danger
      />
    </div>
  );
}
