"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge, Card, ConfirmModal, Empty, Field, Icon, Input, Kebab, Modal,
  SearchInput, Select,
} from "@/components/neu";
import { DocFile } from "@/lib/types";
import { cn, fmtDateTime, timeAgo } from "@/lib/utils";
import {
  PageHead, downloadDemo, extColor, fmtKb, useLookups,
} from "./common";
import { navigate } from "@/lib/nav";

export default function DocumentsView({ focusId }: { focusId?: string | null }) {
  const { db, addDoc, updateDoc, deleteDoc, addDocVersion, pushToast } = useStore();
  const lk = useLookups();
  const [folder, setFolder] = useState<string>("__all__");
  const [q, setQ] = useState("");
  const [fExt, setFExt] = useState("All");
  const [preview, setPreview] = useState<DocFile | null>(null);
  const [ren, setRen] = useState<DocFile | null>(null);
  const [renName, setRenName] = useState("");
  const [move, setMove] = useState<DocFile | null>(null);
  const [moveFolder, setMoveFolder] = useState("");
  const [ver, setVer] = useState<DocFile | null>(null);
  const [verNote, setVerNote] = useState("");
  const [del, setDel] = useState<DocFile | null>(null);
  const [upOpen, setUpOpen] = useState(false);
  const [upForm, setUpForm] = useState({ name: "", ext: "pdf", sizeKb: 0, folder: "", linkType: "none", linkId: "" });

  useEffect(() => {
    if (focusId) {
      const d = db.documents.find((x) => x.id === focusId);
      if (d) setPreview(d);
    }
  }, [focusId, db.documents]);

  const folders = useMemo(() => {
    const m = new Map<string, number>();
    db.documents.forEach((d) => m.set(d.folder, (m.get(d.folder) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [db.documents]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return db.documents.filter((d) => {
      if (folder !== "__all__" && d.folder !== folder) return false;
      if (fExt !== "All" && d.ext !== fExt) return false;
      if (query && !d.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [db.documents, folder, q, fExt]);

  const exts = useMemo(() => [...new Set(db.documents.map((d) => d.ext))], [db.documents]);

  const linkOf = (d: DocFile) =>
    d.matterId
      ? { label: lk.matterName(d.matterId), view: "matters", id: d.matterId }
      : d.leadId
      ? { label: lk.leadName(d.leadId), view: "leads", id: d.leadId }
      : d.clientId
      ? { label: lk.clientName(d.clientId), view: "clients", id: d.clientId }
      : null;

  return (
    <div>
      <PageHead
        title="Documents"
        sub={`${db.documents.length} files · ${folders.length} matter folders`}
        actions={
          <button className="btn-primary" onClick={() => { setUpForm({ name: "", ext: "pdf", sizeKb: 0, folder: folder === "__all__" ? "" : folder, linkType: "none", linkId: "" }); setUpOpen(true); }}>
            <Icon name="upload" size={16} /> Upload
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* Folders */}
        <Card className="h-fit p-3">
          <button
            onClick={() => setFolder("__all__")}
            className={cn("nav-item w-full", folder === "__all__" && "nav-item-active")}
          >
            <Icon name="folder" size={15} /> All documents
            <span className="ml-auto text-[10px] font-bold text-faint">{db.documents.length}</span>
          </button>
          {folders.map(([f, count]) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              className={cn("nav-item w-full", folder === f && "nav-item-active")}
            >
              <Icon name="folder" size={15} />
              <span className="truncate">{f}</span>
              <span className="ml-auto shrink-0 text-[10px] font-bold text-faint">{count}</span>
            </button>
          ))}
        </Card>

        {/* Main */}
        <div>
          <Card className="mb-3 flex flex-wrap items-center gap-2 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search files…" className="w-full sm:w-64" />
            <Select value={fExt} onChange={(e) => setFExt(e.target.value)} className="w-28">
              <option>All</option>
              {exts.map((e) => <option key={e}>{e}</option>)}
            </Select>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="border-b border-[#c6ccd866]">
                  <tr>
                    <th className="th">Document</th>
                    <th className="th">Folder</th>
                    <th className="th">Linked To</th>
                    <th className="th">Uploaded</th>
                    <th className="th text-right">Size</th>
                    <th className="th text-center">Ver.</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const link = linkOf(d);
                    return (
                      <tr key={d.id} className="tr cursor-pointer border-b border-[#c6ccd833] last:border-0" onClick={() => setPreview(d)}>
                        <td className="td">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-neu-xs" style={{ background: extColor(d.ext) }}>
                              <Icon name="file" size={14} />
                            </span>
                            <span className="font-bold">{d.name}</span>
                          </div>
                        </td>
                        <td className="td"><span className="chip text-sub">{d.folder}</span></td>
                        <td className="td">
                          {link ? (
                            <button
                              className="text-xs font-bold text-accent hover:underline"
                              onClick={(e) => { e.stopPropagation(); navigate(link.view, link.id); }}
                            >
                              {link.label}
                            </button>
                          ) : <span className="text-xs text-faint">—</span>}
                        </td>
                        <td className="td text-xs text-sub">{lk.userName(d.uploadedById)} · {timeAgo(d.uploadedAt)}</td>
                        <td className="td text-right text-xs font-semibold">{fmtKb(d.sizeKb)}</td>
                        <td className="td text-center"><span className="chip text-accent">v{d.versions.length}</span></td>
                        <td className="td">
                          <Kebab items={[
                            { label: "Preview", icon: "eye", onClick: () => setPreview(d) },
                            { label: "Download", icon: "download", onClick: () => downloadDemo(d.name, d.name) },
                            { label: "Rename", icon: "pencil", onClick: () => { setRen(d); setRenName(d.name); } },
                            { label: "Move to folder", icon: "folder", onClick: () => { setMove(d); setMoveFolder(d.folder); } },
                            { label: "New version", icon: "history", onClick: () => { setVer(d); setVerNote(""); } },
                            { label: "Delete", icon: "trash", danger: true, onClick: () => setDel(d) },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <Empty icon="folder" title="No documents" hint="Upload files or change folder/filter." />}
            </div>
          </Card>
        </div>
      </div>

      {/* Preview */}
      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.name ?? ""} wide>
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-neu-sm" style={{ background: extColor(preview.ext) }}>
                <Icon name="file" size={22} />
              </span>
              <div className="flex-1">
                <div className="text-xs font-bold text-ink">{preview.name}</div>
                <div className="text-[11px] font-semibold text-faint">
                  {fmtKb(preview.sizeKb)} · {preview.ext.toUpperCase()} · uploaded by {lk.userName(preview.uploadedById)}
                </div>
              </div>
              <button className="btn" onClick={() => downloadDemo(preview.name, preview.name)}>
                <Icon name="download" size={14} /> Download
              </button>
            </div>
            <div className="neu-inset rounded-xl p-6 text-center">
              <Icon name="lock" size={20} className="mx-auto mb-2 text-faint" />
              <p className="text-xs font-semibold text-sub">Simulated preview</p>
              <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-faint">
                In production this renders the actual file (PDF viewer, image, docx)
                from encrypted storage with access controls and an audit entry.
              </p>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Version history</div>
              <div className="space-y-1.5">
                {[...preview.versions].reverse().map((v) => (
                  <div key={v.v} className="neu-inset-sm flex items-center gap-3 rounded-lg p-2.5">
                    <span className="chip text-accent">v{v.v}</span>
                    <span className="flex-1 text-xs font-semibold text-sub">
                      {lk.userName(v.byId)} {v.note ? `— ${v.note}` : ""}
                    </span>
                    <span className="tiny">{fmtDateTime(v.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Rename */}
      <Modal open={ren !== null} onClose={() => setRen(null)} title="Rename Document">
        <Field label="Name"><Input value={renName} onChange={(e) => setRenName(e.target.value)} /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={() => setRen(null)}>Cancel</button>
          <button className="btn-primary" disabled={!renName.trim()} onClick={() => { if (ren) { updateDoc(ren.id, { name: renName }); pushToast("Renamed"); } setRen(null); }}>Save</button>
        </div>
      </Modal>

      {/* Move */}
      <Modal open={move !== null} onClose={() => setMove(null)} title="Move to Folder">
        <Field label="Folder">
          <Input list="lf-folders" value={moveFolder} onChange={(e) => setMoveFolder(e.target.value)} placeholder="Folder name" />
          <datalist id="lf-folders">
            {folders.map(([f]) => <option key={f} value={f} />)}
          </datalist>
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={() => setMove(null)}>Cancel</button>
          <button className="btn-primary" disabled={!moveFolder.trim()} onClick={() => { if (move) { updateDoc(move.id, { folder: moveFolder }); pushToast("Document moved"); } setMove(null); }}>Move</button>
        </div>
      </Modal>

      {/* New version */}
      <Modal open={ver !== null} onClose={() => setVer(null)} title="Upload New Version">
        <p className="muted mb-3">Adds v{(ver?.versions.length ?? 0) + 1} to &ldquo;{ver?.name}&rdquo;. Previous versions stay in history.</p>
        <Field label="Version note"><Input value={verNote} onChange={(e) => setVerNote(e.target.value)} placeholder="What changed?" /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={() => setVer(null)}>Cancel</button>
          <button className="btn-primary" onClick={() => { if (ver) { addDocVersion(ver.id, verNote || undefined); pushToast("New version uploaded"); } setVer(null); }}>Upload version</button>
        </div>
      </Modal>

      {/* Delete */}
      <ConfirmModal
        open={del !== null}
        onClose={() => setDel(null)}
        onConfirm={() => { if (del) { deleteDoc(del.id); pushToast("Document deleted"); } }}
        title="Delete document"
        body={`Permanently delete "${del?.name}" and its ${del?.versions.length ?? 0} version(s)? Logged to the audit trail.`}
        confirmLabel="Delete"
        danger
      />

      {/* Upload */}
      <Modal open={upOpen} onClose={() => setUpOpen(false)} title="Upload Document" wide>
        <div className="space-y-3">
          <label className="neu-inset flex cursor-pointer flex-col items-center gap-2 rounded-xl p-6 text-center transition-shadow hover:shadow-neu-sm">
            <Icon name="upload" size={22} className="text-accent" />
            <span className="text-xs font-bold text-ink">{upForm.name || "Choose a file from your device"}</span>
            <span className="text-[10px] text-faint">Name and size are captured automatically</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUpForm((p) => ({
                    ...p,
                    name: file.name,
                    ext: file.name.split(".").pop() ?? "pdf",
                    sizeKb: Math.max(Math.round(file.size / 1024), 1),
                  }));
                }
              }}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={upForm.name} onChange={(e) => setUpForm((p) => ({ ...p, name: e.target.value, ext: e.target.value.split(".").pop() ?? p.ext }))} /></Field>
            <Field label="Folder">
              <Input list="lf-folders-up" value={upForm.folder} onChange={(e) => setUpForm((p) => ({ ...p, folder: e.target.value }))} placeholder="e.g. Retainers" />
              <datalist id="lf-folders-up">
                {folders.map(([f]) => <option key={f} value={f} />)}
              </datalist>
            </Field>
            <Field label="Link to">
              <Select value={upForm.linkType} onChange={(e) => setUpForm((p) => ({ ...p, linkType: e.target.value, linkId: "" }))}>
                <option value="none">None</option>
                <option value="matter">Matter</option>
                <option value="lead">Lead</option>
                <option value="client">Client</option>
              </Select>
            </Field>
            {upForm.linkType !== "none" && (
              <Field label={upForm.linkType === "matter" ? "Matter" : upForm.linkType === "lead" ? "Lead" : "Client"}>
                <Select value={upForm.linkId} onChange={(e) => setUpForm((p) => ({ ...p, linkId: e.target.value }))}>
                  <option value="">Select…</option>
                  {upForm.linkType === "matter" && db.matters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  {upForm.linkType === "lead" && db.leads.map((l) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>)}
                  {upForm.linkType === "client" && db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setUpOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!upForm.name.trim() || !upForm.folder.trim()}
              onClick={() => {
                const matter = upForm.linkType === "matter" && upForm.linkId ? lk.matter(upForm.linkId) : undefined;
                addDoc({
                  name: upForm.name,
                  folder: upForm.folder,
                  ext: upForm.ext,
                  sizeKb: upForm.sizeKb || 40 + Math.round(Math.random() * 900),
                  matterId: upForm.linkType === "matter" ? upForm.linkId : undefined,
                  leadId: upForm.linkType === "lead" ? upForm.linkId : undefined,
                  clientId: upForm.linkType === "client" ? upForm.linkId : matter?.clientId,
                });
                setUpOpen(false);
                pushToast("Document uploaded");
              }}
            >Upload</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
