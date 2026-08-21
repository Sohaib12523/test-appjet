"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { Badge, Card, Empty, Icon } from "@/components/neu";
import { ConflictCheck } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";
import { PageHead } from "./common";
import { navigate } from "@/lib/nav";

const KIND_TONE: Record<string, "accent" | "ok" | "warn" | "bad" | "viol" | "neutral" | "ink"> = {
  Lead: "accent",
  Client: "ok",
  Matter: "viol",
  Contact: "ink",
  "Opposing Party": "bad",
};

const KIND_VIEW: Record<string, string> = {
  Lead: "leads",
  Client: "clients",
  Matter: "matters",
  Contact: "contacts",
  "Opposing Party": "matters",
};

export default function ConflictView() {
  const { db, user, runConflictCheck } = useStore();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<ConflictCheck | null>(null);

  const run = () => {
    if (q.trim().length < 2) return;
    setResult(runConflictCheck(q));
  };

  return (
    <div>
      <PageHead
        title="Conflict Check"
        sub="Search every lead, client, matter, contact and opposing party before engagement"
      />

      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-faint">
            <Icon name="shield" size={14} className="text-accent" /> New conflict search
          </div>
          <p className="mb-4 text-xs text-sub">
            Enter a person, company or party name — e.g. a prospective client, their
            employer, or the opposing party. Every check is logged to the audit trail.
          </p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="e.g. Crossway Freight, Paul Mitchell, Apex…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            <button className="btn-primary shrink-0" onClick={run} disabled={q.trim().length < 2}>
              <Icon name="search" size={15} /> Run check
            </button>
          </div>
        </Card>

        {result && (
          <div className="animate-up mt-4">
            {result.matches.length === 0 ? (
              <Card className="p-6 text-center">
                <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-ok shadow-neu-in-sm">
                  <Icon name="check" size={26} />
                </span>
                <div className="text-base font-extrabold text-ok">No Potential Conflict Found</div>
                <p className="mt-1 text-xs text-sub">
                  &ldquo;{result.query}&rdquo; does not match any lead, client, matter,
                  contact or opposing party on record.
                </p>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bad shadow-neu-in-sm">
                    <Icon name="alert" size={20} />
                  </span>
                  <div>
                    <div className="text-base font-extrabold text-bad">Potential Conflict Found</div>
                    <div className="text-xs text-sub">
                      {result.matches.length} match(es) for &ldquo;{result.query}&rdquo; — review before proceeding
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {result.matches.map((m2, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(KIND_VIEW[m2.kind], m2.id)}
                      className="neu-inset-sm flex w-full items-center gap-3 rounded-xl p-3 text-left transition-shadow hover:shadow-neu-xs"
                    >
                      <Badge tone={KIND_TONE[m2.kind]}>{m2.kind}</Badge>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ink">{m2.name}</span>
                        <span className="block truncate text-[11px] text-faint">{m2.context}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-accent">
                        Review <Icon name="arrow-right" size={12} />
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* History */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">
            Recent checks
          </div>
          <Card className="p-3">
            {db.conflictChecks.length === 0 && (
              <Empty icon="shield" title="No checks yet" />
            )}
            <div className="space-y-1">
              {db.conflictChecks.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2">
                  <span className={`timeline-dot ${c.matches.length ? "text-bad" : "text-ok"}`}>
                    <Icon name={c.matches.length ? "alert" : "check"} size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-ink">&ldquo;{c.query}&rdquo;</div>
                    <div className="text-[10px] font-semibold text-faint">
                      by {db.users.find((u) => u.id === c.byId)?.name ?? "—"} · {fmtDateTime(c.at)}
                    </div>
                  </div>
                  <Badge tone={c.matches.length ? "bad" : "ok"}>
                    {c.matches.length ? `${c.matches.length} match(es)` : "Clear"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
