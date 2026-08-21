"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar, Icon, Input, Field } from "@/components/neu";
import { ROLE_LABELS, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_ORDER: Role[] = [
  "super_admin",
  "attorney",
  "paralegal",
  "intake_manager",
  "receptionist",
  "client",
];

export default function LoginView() {
  const { db, login, registerClient } = useStore();
  const [mode, setMode] = useState<"staff" | "client">("staff");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const staff = db.users.filter((u) => u.role !== "client");
  const clients = db.users.filter((u) => u.role === "client");

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-white shadow-neu">
            <Icon name="scales" size={30} />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            LawFlow CRM
          </h1>
          <p className="mt-1 max-w-md text-sm text-sub">
            The complete legal CRM — leads, intake, matters, documents, retainers
            and billing in one secure workspace.
          </p>
        </div>

        <div className="neu-card p-5 sm:p-7">
          <div className="seg mx-auto mb-6 w-fit">
            <button
              className={cn("seg-item", mode === "staff" && "seg-item-active")}
              onClick={() => setMode("staff")}
            >
              Staff sign in
            </button>
            <button
              className={cn("seg-item", mode === "client" && "seg-item-active")}
              onClick={() => setMode("client")}
            >
              Client portal
            </button>
          </div>

          {mode === "staff" ? (
            <>
              <p className="mb-4 text-center text-xs font-semibold text-faint">
                Demo build — choose a role to explore. No password required.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {staff.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => login(u.id)}
                    className="neu-card-sm group flex items-center gap-3 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-neu active:shadow-neu-in-sm"
                  >
                    <Avatar name={u.name} color={u.color} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        <span className="truncate">{u.name}</span>
                        {u.twoFactorEnabled && (
                          <Icon name="lock" size={12} className="shrink-0 text-ok" />
                        )}
                      </span>
                      <span className="block truncate text-xs text-faint">
                        {u.title}
                      </span>
                      <span className="mt-1 inline-block rounded-full bg-base px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent shadow-neu-xs">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </span>
                    <Icon
                      name="arrow-right"
                      size={16}
                      className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-center text-xs font-semibold text-faint">
                Clients see only their own case status, documents, invoices and
                messages.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {clients.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => login(u.id)}
                    className="neu-card-sm group flex items-center gap-3 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-neu active:shadow-neu-in-sm"
                  >
                    <Avatar name={u.name} color={u.color} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        {u.name}
                      </span>
                      <span className="block truncate text-xs text-faint">
                        {u.email}
                      </span>
                    </span>
                    <Icon
                      name="arrow-right"
                      size={16}
                      className="shrink-0 text-faint group-hover:text-accent"
                    />
                  </button>
                ))}
              </div>
              <div className="mt-5 border-t border-[#c6ccd866] pt-5">
                <p className="mb-3 text-center text-xs font-bold text-sub">
                  New client? Create a portal account
              </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@mail.com"
                      type="email"
                    />
                  </Field>
                </div>
                <button
                  className="btn-primary mt-3 w-full"
                  disabled={!name.trim() || !email.trim()}
                  onClick={() => registerClient(name.trim(), email.trim())}
                >
                  <Icon name="user" size={16} /> Create portal account
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-faint">
          <Icon name="lock" size={12} /> Role-based access · audit logging · 2FA-ready
          — demo data is stored locally in your browser
        </p>
      </div>
    </div>
  );
}
