"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Avatar, Badge, Card, Drawer, Empty, Icon, Modal, SearchInput, Select, Timeline,
} from "@/components/neu";
import { PA_COLORS, cn, fmtDate, fmtDateTime, fmtMoney } from "@/lib/utils";
import { PageHead, invBal, useLookups } from "./common";
import { navigate } from "@/lib/nav";

export default function ClientsView({ focusId }: { focusId?: string | null }) {
  const { db, convertLead, pushToast } = useStore();
  const lk = useLookups();
  const [q, setQ] = useState("");
  const [fPA, setFPA] = useState("All");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  useEffect(() => {
    if (focusId && db.clients.some((c) => c.id === focusId)) setDrawerId(focusId);
  }, [focusId, db.clients]);

  const readyLeads = db.leads.filter((l) => l.status === "Retainer Signed");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return db.clients.filter((c) => {
      if (fPA !== "All" && c.practiceArea !== fPA) return false;
      if (query && !`${c.name} ${c.email} ${c.company ?? ""}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [db.clients, q, fPA]);

  const client = db.clients.find((c) => c.id === drawerId) ?? null;

  return (
    <div>
      <PageHead
        title="Clients"
        sub={`${db.clients.filter((c) => c.status === "Active").length} active clients`}
        actions={
          <button className="btn-primary" onClick={() => setConvertOpen(true)}>
            <Icon name="user-check" size={16} /> Convert lead
            {readyLeads.length > 0 && (
              <span className="rounded-full bg-white/25 px-1.5 text-[10px]">{readyLeads.length}</span>
            )}
          </button>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search clients…" className="w-full sm:w-64" />
        <Select value={fPA} onChange={(e) => setFPA(e.target.value)} className="w-44">
          <option>All</option>
          {Object.keys(PA_COLORS).map((p) => <option key={p}>{p}</option>)}
        </Select>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => {
          const matters = db.matters.filter((m) => m.clientId === c.id);
          const open = matters.filter((m) => m.status !== "Closed").length;
          const out = db.invoices.filter((i) => i.clientId === c.id).reduce((s, i) => s + invBal(i), 0);
          return (
            <Card key={c.id} onClick={() => setDrawerId(c.id)} className="p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} size={42} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-ink">{c.name}</div>
                    <div className="truncate text-xs text-faint">Client since {fmtDate(c.since)}</div>
                  </div>
                </div>
                <Badge tone={c.status === "Active" ? "ok" : "neutral"}>{c.status}</Badge>
              </div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold" style={{ color: PA_COLORS[c.practiceArea] }}>
                <Icon name="scales" size={12} /> {c.practiceArea}
                <span className="text-faint">· {lk.userName(c.attorneyId)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="neu-inset-sm rounded-lg p-2">
                  <div className="text-sm font-extrabold text-ink">{open}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-faint">Open</div>
                </div>
                <div className="neu-inset-sm rounded-lg p-2">
                  <div className="text-sm font-extrabold text-ink">{matters.length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-faint">Matters</div>
                </div>
                <div className="neu-inset-sm rounded-lg p-2">
                  <div className={cn("text-sm font-extrabold", out > 0 ? "text-bad" : "text-ok")}>{fmtMoney(out)}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wide text-faint">Balance</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && <Card><Empty icon="user-check" title="No clients found" /></Card>}

      {/* Client drawer */}
      <Drawer
        open={client !== null}
        onClose={() => setDrawerId(null)}
        width={600}
        title={
          client ? (
            <div className="flex items-center gap-3">
              <Avatar name={client.name} size={38} />
              <div>
                <div className="truncate">{client.name}</div>
                <div className="text-[11px] font-semibold text-faint">{client.email} · {client.phone}</div>
              </div>
            </div>
          ) : ""
        }
      >
        {client && (
          <div className="space-y-5">
            {client.address && (
              <div className="neu-inset-sm rounded-xl p-3 text-xs font-semibold text-sub">
                <Icon name="building" size={12} className="mr-1.5 inline text-faint" />{client.address}
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-faint">Matters</span>
                <button className="btn-sm" onClick={() => { setDrawerId(null); navigate("matters"); }}>Open matters</button>
              </div>
              <div className="space-y-2">
                {db.matters.filter((m) => m.clientId === client.id).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setDrawerId(null); navigate("matters", m.id); }}
                    className="neu-inset-sm flex w-full items-center gap-3 rounded-xl p-3 text-left transition-shadow hover:shadow-neu-xs"
                  >
                    <span className="timeline-dot text-accent"><Icon name="briefcase" size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-ink">{m.name}</span>
                      <span className="text-[10px] font-semibold text-faint">{m.number} · {fmtMoney(m.caseValue)}</span>
                    </span>
                    <Badge tone={m.status === "Closed" ? "neutral" : "accent"}>{m.status}</Badge>
                  </button>
                ))}
                {db.matters.filter((m) => m.clientId === client.id).length === 0 && (
                  <p className="py-4 text-center text-xs text-faint">No matters yet</p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Invoices</div>
              <div className="space-y-2">
                {db.invoices.filter((i) => i.clientId === client.id).map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => { setDrawerId(null); navigate("billing"); }}
                    className="neu-inset-sm flex w-full items-center gap-3 rounded-xl p-3 text-left"
                  >
                    <span className="timeline-dot text-warn"><Icon name="money" size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-ink">{inv.number}</span>
                      <span className="text-[10px] font-semibold text-faint">Due {fmtDate(inv.dueDate)}</span>
                    </span>
                    <span className={cn("text-xs font-bold", invBal(inv) > 0 ? "text-bad" : "text-ok")}>{fmtMoney(invBal(inv))}</span>
                  </button>
                ))}
                {db.invoices.filter((i) => i.clientId === client.id).length === 0 && (
                  <p className="py-4 text-center text-xs text-faint">No invoices</p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Recent communications</div>
              <Timeline
                items={db.communications
                  .filter((c) => c.clientId === client.id)
                  .slice(0, 6)
                  .map((c) => ({
                    id: c.id, at: c.at,
                    icon: c.type === "Email" ? "mail" : c.type === "SMS" ? "chat" : c.type === "Phone Call" ? "phone" : "note",
                    title: c.subject ?? `${c.type} — ${c.fromName} → ${c.toName}`,
                    body: c.body,
                  }))}
                renderTime={(iso) => fmtDateTime(iso)}
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* Convert-lead shortcut */}
      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert lead to client">
        {readyLeads.length === 0 ? (
          <Empty icon="sign" title="No leads ready" hint="Leads with a signed retainer appear here for one-click conversion." />
        ) : (
          <div className="space-y-2">
            {readyLeads.map((l) => (
              <div key={l.id} className="neu-inset-sm flex items-center gap-3 rounded-xl p-3">
                <Avatar name={`${l.firstName} ${l.lastName}`} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-ink">{l.firstName} {l.lastName}</div>
                  <div className="text-[10px] font-semibold text-faint">{l.practiceArea} — {l.caseType} · {fmtMoney(l.estimatedValue)}</div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    const res = convertLead(l.id);
                    if (res) {
                      pushToast("Converted — client + matter created");
                      setConvertOpen(false);
                      navigate("matters", res.matterId);
                    }
                  }}
                >
                  <Icon name="bolt" size={14} /> Convert
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
