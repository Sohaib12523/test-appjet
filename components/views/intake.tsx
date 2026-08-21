"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge, Card, ConfirmModal, Drawer, Empty, Field, Icon, Input, Modal,
  Segmented, Select, Textarea, Toggle,
} from "@/components/neu";
import { IntakeField, IntakeForm, PRACTICE_AREAS, PracticeArea } from "@/lib/types";
import { cn, fmtDateTime, timeAgo, uid } from "@/lib/utils";
import { PageHead } from "./common";
import { navigate } from "@/lib/nav";

const FIELD_TYPES: { v: IntakeField["type"]; label: string }[] = [
  { v: "text", label: "Short text" },
  { v: "textarea", label: "Long text" },
  { v: "select", label: "Dropdown" },
  { v: "date", label: "Date" },
  { v: "yesno", label: "Yes / No" },
  { v: "number", label: "Number" },
  { v: "phone", label: "Phone" },
  { v: "email", label: "Email" },
];

export default function IntakeView() {
  const { db, can, submitIntake, processSubmission, deleteIntakeForm, pushToast } =
    useStore();
  const [tab, setTab] = useState<"forms" | "submissions">("forms");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [builder, setBuilder] = useState<IntakeForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewSub, setViewSub] = useState<string | null>(null);

  const subs = db.intakeSubmissions;

  return (
    <div>
      <PageHead
        title="Client Intake"
        sub="Customizable per-practice-area forms that feed the lead pipeline"
        actions={
          <>
            <Segmented
              options={[
                { value: "forms", label: "Forms" },
                { value: "submissions", label: `Submissions (${subs.filter((s) => s.status === "New").length} new)` },
              ]}
              value={tab}
              onChange={setTab}
            />
            {can("intake.edit") && (
              <button
                className="btn-primary"
                onClick={() =>
                  setBuilder({
                    id: uid("f"),
                    name: "",
                    practiceArea: "Personal Injury",
                    active: true,
                    submissions: 0,
                    fields: [
                      { id: uid("q"), label: "Full name", type: "text", required: true },
                      { id: uid("q"), label: "Email", type: "email", required: true },
                      { id: uid("q"), label: "Phone", type: "phone", required: true },
                    ],
                  })
                }
              >
                <Icon name="plus" size={16} /> New Form
              </button>
            )}
          </>
        }
      />

      {tab === "forms" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {db.intakeForms.map((f) => (
            <Card key={f.id} className="flex flex-col p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-accent shadow-neu-in-sm">
                  <Icon name="clipboard" size={20} />
                </span>
                <Badge tone={f.active ? "ok" : "neutral"}>{f.active ? "Live" : "Paused"}</Badge>
              </div>
              <div className="text-sm font-bold text-ink">{f.name}</div>
              <div className="mb-3 text-xs text-faint">{f.practiceArea} · {f.fields.length} questions</div>
              <div className="mb-4 flex items-center gap-3 text-xs font-semibold text-sub">
                <span className="flex items-center gap-1"><Icon name="users" size={13} /> {f.submissions} submissions</span>
                {f.fields.some((x) => x.conditionalOn) && (
                  <span className="flex items-center gap-1 text-viol"><Icon name="bolt" size={13} /> Conditional logic</span>
                )}
              </div>
              <div className="mt-auto flex gap-2">
                <button className="btn flex-1" onClick={() => setPreviewId(f.id)}>
                  <Icon name="eye" size={14} /> Preview & fill
                </button>
                {can("intake.edit") && (
                  <>
                    <button className="icon-btn" title="Edit form" onClick={() => setBuilder(JSON.parse(JSON.stringify(f)))}>
                      <Icon name="pencil" size={15} />
                    </button>
                    <button className="icon-btn text-bad" title="Delete" onClick={() => setDeleteId(f.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-[#c6ccd866]">
                <tr>
                  <th className="th">Submitter</th>
                  <th className="th">Form</th>
                  <th className="th">Submitted</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => {
                  const form = db.intakeForms.find((f) => f.id === s.formId);
                  return (
                    <tr key={s.id} className="tr cursor-pointer border-b border-[#c6ccd833] last:border-0" onClick={() => setViewSub(s.id)}>
                      <td className="td font-bold">{s.data["Full name"] ?? "—"}</td>
                      <td className="td text-xs font-semibold text-sub">{form?.name ?? "—"}</td>
                      <td className="td text-xs text-sub">{timeAgo(s.submittedAt)}</td>
                      <td className="td">
                        <Badge tone={s.status === "New" ? "accent" : "ok"}>{s.status}</Badge>
                      </td>
                      <td className="td text-right">
                        {s.status === "New" ? (
                          <button
                            className="btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              processSubmission(s.id);
                              pushToast("Submission converted to lead — automations fired");
                            }}
                          >
                            <Icon name="bolt" size={13} /> Process → Lead
                          </button>
                        ) : s.leadId ? (
                          <button className="btn-sm" onClick={(e) => { e.stopPropagation(); navigate("leads", s.leadId); }}>
                            View lead <Icon name="arrow-right" size={12} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {subs.length === 0 && <Empty icon="clipboard" title="No submissions yet" hint="Preview a form and submit it to see the pipeline in action." />}
          </div>
        </Card>
      )}

      {/* Preview / fill */}
      <IntakeRunner formId={previewId} onClose={() => setPreviewId(null)} onSubmit={(formId, data) => { submitIntake(formId, data); pushToast("Intake form submitted"); setPreviewId(null); }} />

      {/* Builder */}
      {builder && <FormBuilder form={builder} onClose={() => setBuilder(null)} />}

      {/* Submission detail */}
      <Drawer
        open={viewSub !== null}
        onClose={() => setViewSub(null)}
        title="Intake submission"
      >
        {viewSub && (() => {
          const s = subs.find((x) => x.id === viewSub);
          if (!s) return null;
          const form = db.intakeForms.find((f) => f.id === s.formId);
          return (
            <div className="space-y-3">
              <div className="neu-inset-sm flex items-center justify-between rounded-xl p-3">
                <div>
                  <div className="text-xs font-bold text-ink">{form?.name}</div>
                  <div className="text-[10px] text-faint">{fmtDateTime(s.submittedAt)}</div>
                </div>
                <Badge tone={s.status === "New" ? "accent" : "ok"}>{s.status}</Badge>
              </div>
              {Object.entries(s.data).map(([k, v]) => (
                <div key={k} className="neu-inset-sm rounded-xl p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-faint">{k}</div>
                  <div className="mt-0.5 whitespace-pre-wrap text-xs font-semibold text-ink">{v || "—"}</div>
                </div>
              ))}
              {s.status === "New" && (
                <button
                  className="btn-primary w-full"
                  onClick={() => { processSubmission(s.id); pushToast("Lead created from submission"); setViewSub(null); }}
                >
                  <Icon name="bolt" size={15} /> Process → create lead, assign intake manager & follow-up task
                </button>
              )}
            </div>
          );
        })()}
      </Drawer>

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { deleteIntakeForm(deleteId); pushToast("Form deleted"); } }}
        title="Delete intake form"
        body="The form will be removed. Existing submissions are kept."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

/* ================= Public form runner (with conditional logic) ================= */

function IntakeRunner({
  formId, onClose, onSubmit,
}: {
  formId: string | null;
  onClose: () => void;
  onSubmit: (formId: string, data: Record<string, string>) => void;
}) {
  const { db } = useStore();
  const form = db.intakeForms.find((f) => f.id === formId) ?? null;
  const [data, setData] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const visible = (f: IntakeField) => {
    if (!f.conditionalOn) return true;
    const parent = form?.fields.find((x) => x.id === f.conditionalOn!.fieldId);
    if (!parent) return true;
    return data[parent.label] === f.conditionalOn.equals;
  };

  if (!form) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;

  return (
    <Modal open onClose={() => { setData({}); setDone(false); onClose(); }} title={form.name} wide>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full text-ok shadow-neu-in-sm">
            <Icon name="check" size={26} />
          </span>
          <div className="text-base font-bold text-ink">Submission received</div>
          <p className="max-w-sm text-xs leading-relaxed text-sub">
            In production this form lives on your website. On submit it creates a
            lead, assigns the practice area and intake manager, creates a follow-up
            task and notifies the team.
          </p>
          <button className="btn" onClick={() => { setData({}); setDone(false); onClose(); }}>Close</button>
        </div>
      ) : (
        <>
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-faint">
            <Icon name="globe" size={13} /> Website form · {form.practiceArea} — conditional questions appear as you answer
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {form.fields.filter(visible).map((f) => (
              <div key={f.id} className={cn(f.type === "textarea" && "sm:col-span-2", "animate-fade")}>
                <Field label={`${f.label}${f.required ? " *" : ""}`}>
                  {f.type === "textarea" ? (
                    <Textarea value={data[f.label] ?? ""} onChange={(e) => setData((p) => ({ ...p, [f.label]: e.target.value }))} />
                  ) : f.type === "select" ? (
                    <Select value={data[f.label] ?? ""} onChange={(e) => setData((p) => ({ ...p, [f.label]: e.target.value }))}>
                      <option value="">Select…</option>
                      {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
                    </Select>
                  ) : f.type === "yesno" ? (
                    <Select value={data[f.label] ?? ""} onChange={(e) => setData((p) => ({ ...p, [f.label]: e.target.value }))}>
                      <option value="">Select…</option>
                      <option>Yes</option>
                      <option>No</option>
                    </Select>
                  ) : (
                    <Input
                      type={f.type === "date" ? "date" : f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                      value={data[f.label] ?? ""}
                      onChange={(e) => setData((p) => ({ ...p, [f.label]: e.target.value }))}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn" onClick={() => { setData({}); onClose(); }}>Cancel</button>
            <button
              className="btn-primary"
              disabled={form.fields.filter((f) => f.required && visible(f)).some((f) => !(data[f.label] ?? "").trim())}
              onClick={() => { onSubmit(form.id, data); setDone(true); }}
            >
              <Icon name="send" size={15} /> Submit intake
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ================= Form builder ================= */

function FormBuilder({ form, onClose }: { form: IntakeForm; onClose: () => void }) {
  const { saveIntakeForm, pushToast } = useStore();
  const [f, setF] = useState<IntakeForm>(form);

  const setField = (id: string, patch: Partial<IntakeField>) =>
    setF((p) => ({ ...p, fields: p.fields.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const moveField = (i: number, dir: -1 | 1) =>
    setF((p) => {
      const fields = [...p.fields];
      const j = i + dir;
      if (j < 0 || j >= fields.length) return p;
      [fields[i], fields[j]] = [fields[j], fields[i]];
      return { ...p, fields };
    });

  return (
    <Modal open onClose={onClose} title={form.name ? `Edit — ${form.name}` : "New Intake Form"} wide>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Field label="Form name"><Input value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Estate Planning Intake" /></Field>
        <Field label="Practice area">
          <Select value={f.practiceArea} onChange={(e) => setF((p) => ({ ...p, practiceArea: e.target.value as PracticeArea }))}>
            {PRACTICE_AREAS.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <div className="neu-inset-sm flex h-[42px] items-center justify-between rounded-xl px-3">
            <span className="text-xs font-bold text-sub">{f.active ? "Live" : "Paused"}</span>
            <Toggle on={f.active} onChange={(v) => setF((p) => ({ ...p, active: v }))} />
          </div>
        </Field>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-faint">Questions ({f.fields.length})</span>
        <button className="btn-sm" onClick={() => setF((p) => ({ ...p, fields: [...p.fields, { id: uid("q"), label: "", type: "text", required: false }] }))}>
          <Icon name="plus" size={13} /> Add question
        </button>
      </div>

      <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
        {f.fields.map((field, i) => (
          <div key={field.id} className="neu-inset-sm rounded-xl p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
              <Input placeholder="Question label" value={field.label} onChange={(e) => setField(field.id, { label: e.target.value })} />
              <Select value={field.type} onChange={(e) => setField(field.id, { type: e.target.value as IntakeField["type"] })}>
                {FIELD_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </Select>
              <div className="flex items-center gap-1">
                <button className="icon-btn h-8 w-8" onClick={() => moveField(i, -1)} disabled={i === 0} title="Move up"><Icon name="chevron-down" size={13} className="rotate-180" /></button>
                <button className="icon-btn h-8 w-8" onClick={() => moveField(i, 1)} disabled={i === f.fields.length - 1} title="Move down"><Icon name="chevron-down" size={13} /></button>
                <button className="icon-btn h-8 w-8 text-bad" onClick={() => setF((p) => ({ ...p, fields: p.fields.filter((x) => x.id !== field.id) }))} title="Delete"><Icon name="trash" size={13} /></button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-sub">
                <input type="checkbox" className="accent-[#2f6bff]" checked={field.required} onChange={(e) => setField(field.id, { required: e.target.checked })} />
                Required
              </label>
              {field.type === "select" && (
                <Input
                  className="max-w-xs"
                  placeholder="Options, comma separated"
                  value={(field.options ?? []).join(", ")}
                  onChange={(e) => setField(field.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              )}
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-sub">
                <Icon name="bolt" size={11} className="text-viol" /> Show only if
                <Select
                  value={field.conditionalOn?.fieldId ?? ""}
                  onChange={(e) => {
                    const fid = e.target.value;
                    setField(field.id, { conditionalOn: fid ? { fieldId: fid, equals: "Yes" } : undefined });
                  }}
                  className="w-36"
                >
                  <option value="">Always show</option>
                  {f.fields.filter((x) => x.id !== field.id && x.label.trim()).map((x) => (
                    <option key={x.id} value={x.id}>{x.label}</option>
                  ))}
                </Select>
                {field.conditionalOn && (
                  <>
                    <span>=</span>
                    <Input className="w-20" value={field.conditionalOn.equals} onChange={(e) => setField(field.id, { conditionalOn: { ...field.conditionalOn!, equals: e.target.value } })} />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button
          className="btn-primary"
          disabled={!f.name.trim() || f.fields.length === 0 || f.fields.some((x) => !x.label.trim())}
          onClick={() => { saveIntakeForm(f); pushToast("Intake form saved"); onClose(); }}
        >
          Save form
        </button>
      </div>
    </Modal>
  );
}
