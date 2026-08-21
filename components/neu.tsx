"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn, initials, Tone } from "@/lib/utils";

/* ---------------- Icons ---------------- */

const PATHS: Record<string, React.ReactNode> = {
  grid: (<><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></>),
  users: (<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M15.8 13.6c2.6.3 4.7 2.2 4.7 4.4" /></>),
  book: (<><rect x="5" y="3" width="14" height="18" rx="2.5" /><circle cx="12" cy="9" r="2.4" /><path d="M8 16.5c.8-2 2.2-3 4-3s3.2 1 4 3" /><path d="M5 6.5h-1M5 12H4M5 17.5h-1" /></>),
  "user-check": (<><circle cx="10" cy="8" r="3.2" /><path d="M4.5 19c0-3 2.5-5 5.5-5 1.5 0 2.8.5 3.8 1.4" /><path d="m14.5 18 2 2 3.5-3.5" /></>),
  briefcase: (<><rect x="3" y="7.5" width="18" height="12.5" rx="2.5" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" /><path d="M3 12.5h18" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><circle cx="8.5" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="14" r="1" fill="currentColor" stroke="none" /></>),
  "check-square": (<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12.2 2.4 2.4 4.6-5" /></>),
  file: (<><path d="M6 3.5h7.5L19 9v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z" /><path d="M13.5 3.5V9H19" /><path d="M8.5 13.5h7M8.5 17h7" /></>),
  message: (<><path d="M20 12a8 8 0 0 1-11.6 7.2L4 20.5l1.4-4.2A8 8 0 1 1 20 12Z" /></>),
  card: (<><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 9.8h18" /><path d="M7 14.5h4" /></>),
  chart: (<><path d="M4 4v15a1 1 0 0 0 1 1h15" /><rect x="8" y="11" width="3" height="6" rx="1" /><rect x="13" y="7" width="3" height="10" rx="1" /><rect x="18" y="9" width="3" height="8" rx="1" transform="translate(-3 0)" /></>),
  bolt: (<path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />),
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" /></>),
  shield: (<><path d="M12 3 5 5.8v5.4c0 4.3 2.9 7.6 7 9.3 4.1-1.7 7-5 7-9.3V5.8L12 3Z" /><path d="m9 11.5 2.2 2.2 4-4.2" /></>),
  clipboard: (<><rect x="5" y="4.5" width="14" height="17" rx="2.5" /><path d="M9 4.5V3.8A1.8 1.8 0 0 1 10.8 2h2.4A1.8 1.8 0 0 1 15 3.8v.7" /><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4.5" /></>),
  globe: (<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5Z" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>),
  bell: (<><path d="M18 9.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10.3 19.5a1.9 1.9 0 0 0 3.4 0" /></>),
  plus: (<path d="M12 5v14M5 12h14" />),
  x: (<path d="M6 6l12 12M18 6 6 18" />),
  "chevron-down": (<path d="m6 9.5 6 6 6-6" />),
  "chevron-left": (<path d="m14.5 6-6 6 6 6" />),
  "chevron-right": (<path d="m9.5 6 6 6-6 6" />),
  dots: (<><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></>),
  download: (<><path d="M12 4v10.5" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M4.5 19.5h15" /></>),
  trash: (<><path d="M4.5 6.5h15" /><path d="M9.5 6V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" /><path d="M6.5 6.5 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13.5" /><path d="M10 11v6M14 11v6" /></>),
  pencil: (<><path d="m14.5 5 4.5 4.5L8 20.5l-5 1 1-5L14.5 5Z" /><path d="m12.5 7 4.5 4.5" /></>),
  eye: (<><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>),
  upload: (<><path d="M12 15V4.5" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4.5 19.5h15" /></>),
  phone: (<path d="M7.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 5.5 5.5a2 2 0 0 1 2-2Z" />),
  mail: (<><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m4 7.5 8 6 8-6" /></>),
  chat: (<><path d="M20 11.5a7.5 7.5 0 0 1-11 6.7L4 19.5l1.4-4A7.5 7.5 0 1 1 20 11.5Z" /><path d="M9 10h6M9 13h4" /></>),
  note: (<><path d="M5 20h14" /><path d="m6 16 9.5-9.5a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L9 19l-4 1 1-4Z" /></>),
  logout: (<><path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" /><path d="M17 8.5 20.5 12 17 15.5" /><path d="M10 12h10.5" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  alert: (<><path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4" /><circle cx="12" cy="16.8" r=".8" fill="currentColor" stroke="none" /></>),
  check: (<path d="m5 12.5 4.5 4.5L19 7.5" />),
  filter: (<path d="M4 5.5h16l-6.2 7v5.7l-3.6 1.8v-7.5L4 5.5Z" />),
  "arrow-right": (<><path d="M4 12h15.5" /><path d="m14 6.5 5.5 5.5-5.5 5.5" /></>),
  folder: (<path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11Z" />),
  scales: (<><path d="M12 4v16M8 20h8" /><path d="M12 6 5 8m7-2 7 2" /><path d="M2.5 13 5 8l2.5 5a2.6 2.6 0 0 1-5 0ZM16.5 13 19 8l2.5 5a2.6 2.6 0 0 1-5 0Z" /></>),
  send: (<path d="M21 3.5 10.5 14M21 3.5 14 21l-3.5-7L3 10.5 21 3.5Z" />),
  history: (<><path d="M4 5v5h5" /><path d="M4.5 10a8 8 0 1 1-1 6" /><path d="M12 8.5V12l2.5 1.5" /></>),
  kanban: (<><rect x="4" y="4" width="4.5" height="16" rx="1.5" /><rect x="10.5" y="4" width="4.5" height="10" rx="1.5" /><rect x="17" y="4" width="4.5" height="13" rx="1.5" transform="translate(-1.5 0)" /></>),
  table: (<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9h17M3.5 14h17" /></>),
  star: (<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8L12 3.5Z" />),
  dot: (<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />),
  money: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.2 9.3c.5-.9 1.6-1.3 2.8-1.3 1.6 0 2.8.8 2.8 2 0 2.6-5.6 1.6-5.6 4.2 0 1.2 1.2 2 2.8 2 1.2 0 2.3-.4 2.8-1.3" /></>),
  building: (<><rect x="5" y="3.5" width="14" height="17" rx="1.5" /><path d="M9 7h2M13 7h2M9 10.5h2M13 10.5h2M9 14h2M13 14h2M10.5 20.5v-3h3v3" /></>),
  user: (<><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" /></>),
  printer: (<><path d="M7 8V4h10v4" /><rect x="4" y="8" width="16" height="8" rx="2" /><path d="M7 13h10v7H7z" /></>),
  lock: (<><rect x="5.5" y="10.5" width="13" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /><circle cx="12" cy="15.3" r="1.2" fill="currentColor" stroke="none" /></>),
  sign: (<><path d="m4 20 5.5-1L20 8.5a1.9 1.9 0 0 0-2.7-2.7L7 16.3 4 20Z" transform="translate(0 -2)" /><path d="M3 21.5h18" /></>),
};

export function Icon({
  name, size = 18, className, strokeWidth = 1.8,
}: { name: keyof typeof PATHS | string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" className={cn("shrink-0", className)} aria-hidden
    >
      {PATHS[name] ?? PATHS.dot}
    </svg>
  );
}

/* ---------------- Cards ---------------- */

export function Card({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick} className={cn("neu-card", onClick && "cursor-pointer transition-transform hover:-translate-y-0.5", className)}>{children}</div>;
}

export function Section({
  title, subtitle, right, className, bodyClassName, children,
}: { title?: string; subtitle?: string; right?: React.ReactNode; className?: string; bodyClassName?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("p-5", className)}>
      {title && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="card-title">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-faint">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

/* ---------------- Badge / Avatar / Stat ---------------- */

const TONE_BG: Record<Tone, string> = {
  accent: "#2f6bff", ok: "#2f9e77", warn: "#c9862b", bad: "#d05555",
  viol: "#7a5af8", neutral: "#8b97b5", ink: "#1f2a44",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const c = TONE_BG[tone];
  return (
    <span className={cn("chip", className)} style={{ color: c, background: "#e0e5ec" }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {children}
    </span>
  );
}

export function Avatar({ name, color, size = 34, className }: { name: string; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-neu-xs", className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: color ?? "#5d6b8c" }}
    >
      {initials(name)}
    </span>
  );
}

export function Stat({ label, value, icon, tone = "accent", delta, onClick }: {
  label: string; value: React.ReactNode; icon: string; tone?: Tone; delta?: string; onClick?: () => void;
}) {
  const c = TONE_BG[tone];
  return (
    <Card onClick={onClick} className="flex items-center gap-4 p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-neu-in-sm" style={{ color: c }}>
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0">
        <div className="kpi-num">{value}</div>
        <div className="truncate text-xs font-semibold text-sub">{label}</div>
        {delta && <div className="mt-0.5 text-[11px] font-semibold" style={{ color: c }}>{delta}</div>}
      </div>
    </Card>
  );
}

/* ---------------- Form fields ---------------- */

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cn("input resize-none", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn("input appearance-none pr-9", props.className)} />
      <Icon name="chevron-down" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint" />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "Search…"} className="input pl-9" />
    </div>
  );
}

/* ---------------- Toggle ---------------- */

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("relative h-6.5 w-11 shrink-0 rounded-full transition-colors shadow-neu-in-sm", disabled && "opacity-50")}
      style={{ height: 26, background: on ? "#2f6bff" : "#e0e5ec" }}
      aria-pressed={on}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-base shadow-neu-xs transition-all"
        style={{ left: on ? 22 : 3 }}
      />
    </button>
  );
}

/* ---------------- Segmented / Tabs ---------------- */

export function Segmented<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string; icon?: string }[]; value: T; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div className={cn("seg", className)}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn("seg-item inline-flex items-center gap-1.5", value === o.value && "seg-item-active")}>
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string;
}) {
  return (
    <div className={cn("neu-inset-sm flex gap-1 overflow-x-auto p-1.5", className)}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn("tab-item", value === o.value && "tab-item-active")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Modal / Drawer / Confirm ---------------- */

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-[#1f2a4433] p-3 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <div
        className={cn("animate-up neu-card max-h-[88vh] w-full overflow-y-auto p-6", wide ? "max-w-2xl" : "max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button className="icon-btn h-8 w-8" onClick={onClose} aria-label="Close"><Icon name="x" size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ open, onClose, onConfirm, title, body, confirmLabel = "Confirm", danger }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: string; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="muted mb-5">{body}</p>
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className={danger ? "btn-danger" : "btn-primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function Drawer({ open, onClose, title, children, width = 560 }: {
  open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="animate-fade fixed inset-0 z-50 bg-[#1f2a4433] backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="animate-left absolute right-0 top-0 flex h-full w-full flex-col bg-base shadow-neu-pop sm:m-3 sm:h-[calc(100%-24px)] sm:rounded-2xl"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#c6ccd855] px-5 py-4">
          <div className="min-w-0 text-base font-bold">{title}</div>
          <button className="icon-btn h-8 w-8 shrink-0" onClick={onClose} aria-label="Close"><Icon name="x" size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Empty / Kebab / Timeline ---------------- */

export function Empty({ icon = "folder", title, hint, action }: {
  icon?: string; title: string; hint?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-faint shadow-neu-in-sm">
        <Icon name={icon} size={26} />
      </span>
      <div className="text-sm font-bold text-ink">{title}</div>
      {hint && <div className="max-w-xs text-xs text-faint">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Kebab({ items }: { items: { label: string; icon?: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button className="icon-btn h-8 w-8" onClick={() => setOpen((v) => !v)} aria-label="Actions">
        <Icon name="dots" size={16} />
      </button>
      {open && (
        <div className="animate-fade neu-card-sm absolute right-0 top-10 z-30 w-44 p-1.5">
          {items.map((it) => (
            <button key={it.label}
              onClick={() => { setOpen(false); it.onClick(); }}
              className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-sub transition-colors hover:bg-[#2f6bff10] hover:text-ink", it.danger && "text-bad hover:text-bad")}>
              {it.icon && <Icon name={it.icon} size={14} />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface TimelineItem {
  id: string;
  at: string;
  icon: string;
  color?: string;
  title: string;
  body?: string;
}

export function Timeline({ items, renderTime }: { items: TimelineItem[]; renderTime: (iso: string) => string }) {
  if (items.length === 0) return <Empty icon="history" title="No activity yet" />;
  return (
    <div className="space-y-0">
      {items.map((it, i) => (
        <div key={it.id} className="relative flex gap-3 pb-5">
          {i < items.length - 1 && <span className="absolute left-4 top-9 h-[calc(100%-28px)] w-[2px] rounded bg-[#c6ccd888]" />}
          <span className="timeline-dot" style={{ color: it.color ?? "#2f6bff" }}>
            <Icon name={it.icon} size={15} />
          </span>
          <div className="min-w-0 pt-1">
            <div className="text-[13px] font-semibold leading-snug text-ink">{it.title}</div>
            {it.body && <div className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-sub">{it.body}</div>}
            <div className="tiny mt-1">{renderTime(it.at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({ value, size = 120, stroke = 11, color = "#2f6bff", label }: {
  value: number; size?: number; stroke?: number; color?: string; label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#c6ccd8" strokeWidth={stroke} fill="none" strokeLinecap="round" opacity={0.6} />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-ink">{Math.round(pct)}%</span>
        {label && <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</span>}
      </div>
    </div>
  );
}
