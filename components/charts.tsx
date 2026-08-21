"use client";

import React, { useState } from "react";
import { cn, fmtMoney } from "@/lib/utils";

/* ---------- Donut ---------- */

export function Donut({ data, size = 170, stroke = 22, centerLabel }: {
  data: { label: string; value: number; color: string }[];
  size?: number; stroke?: number; centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {data.map((d) => {
            const frac = d.value / total;
            const el = (
              <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={d.color} strokeWidth={stroke} strokeLinecap="butt"
                strokeDasharray={`${Math.max(frac * c - 2, 0.5)} ${c}`}
                strokeDashoffset={-offset * c} />
            );
            offset += frac;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-ink">{total}</span>
          {centerLabel && <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">{centerLabel}</span>}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 truncate font-medium text-sub">{d.label}</span>
            <span className="font-bold text-ink">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Vertical bars ---------- */

export function Bars({ data, height = 160, money, color = "#2f6bff" }: {
  data: { label: string; value: number }[]; height?: number; money?: boolean; color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
            {hover === i && (
              <div className="neu-card-sm absolute -top-1 z-10 -translate-y-full whitespace-nowrap px-2.5 py-1 text-[11px] font-bold text-ink">
                {money ? fmtMoney(d.value) : d.value}
              </div>
            )}
            <div
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              className="w-full max-w-[38px] rounded-t-lg transition-all group-hover:opacity-80"
              style={{
                height: `${Math.max((d.value / max) * (height - 8), 4)}px`,
                background: `linear-gradient(180deg, ${color}, ${color}bb)`,
                boxShadow: "3px 3px 8px #c6ccd8, inset 0 1px 0 rgba(255,255,255,.35)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-[10px] font-semibold text-faint" title={d.label}>{d.label}</div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Horizontal bars ---------- */

export function HBars({ data, money }: { data: { label: string; value: number; color?: string }[]; money?: boolean }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-sub">{d.label}</span>
            <span className="font-bold text-ink">{money ? fmtMoney(d.value) : d.value}</span>
          </div>
          <div className="neu-inset-sm h-3 overflow-hidden rounded-full">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? "#2f6bff" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Line / area ---------- */

export function LineArea({ data, height = 170, money, color = "#2f6bff" }: {
  data: { label: string; value: number }[]; height?: number; money?: boolean; color?: string;
}) {
  const w = 560;
  const h = height - 26;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const px = (i: number) => (i / Math.max(data.length - 1, 1)) * (w - 16) + 8;
  const py = (v: number) => h - ((v - min) / range) * (h - 18) + 6;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(d.value)}`).join(" ");
  const area = `${line} L${px(data.length - 1)},${h + 4} L${px(0)},${h + 4} Z`;
  const [hover, setHover] = useState<number | null>(null);
  const gid = React.useId();
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h + 22}`} className="w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={8} x2={w - 8} y1={h * f} y2={h * f} stroke="#c6ccd8" strokeWidth="1" strokeDasharray="3 5" opacity="0.7" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(d.value)} r={hover === i ? 5.5 : 3.5} fill={color} stroke="#e0e5ec" strokeWidth="2"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            <rect x={px(i) - w / data.length / 2} y={0} width={w / data.length} height={h} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            <text x={px(i)} y={h + 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="#8b97b5">{d.label}</text>
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="neu-card-sm pointer-events-none absolute px-2.5 py-1 text-[11px] font-bold text-ink"
          style={{ left: `${(px(hover) / w) * 100}%`, top: 0, transform: "translateX(-50%)" }}>
          {money ? fmtMoney(data[hover].value) : data[hover].value}
        </div>
      )}
    </div>
  );
}

/* ---------- Funnel ---------- */

export function Funnel({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = Math.max((d.value / max) * 100, 6);
        const conv = i > 0 && data[i - 1].value > 0 ? Math.round((d.value / data[i - 1].value) * 100) : null;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <div className="neu-inset-sm relative h-9 flex-1 overflow-hidden rounded-xl">
              <div className="flex h-full items-center rounded-xl px-3 transition-all duration-500"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${d.color ?? "#2f6bff"}, ${(d.color ?? "#2f6bff")}cc)` }}>
                <span className="whitespace-nowrap text-[11px] font-bold text-white drop-shadow-sm">{d.label}</span>
              </div>
            </div>
            <div className="w-20 shrink-0 text-right">
              <span className="text-sm font-extrabold text-ink">{d.value}</span>
              {conv !== null && <span className="ml-1.5 text-[10px] font-semibold text-faint">{conv}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Sparkline ---------- */

export function Sparkline({ values, color = "#2f6bff", width = 96, height = 30 }: {
  values: number[]; color?: string; width?: number; height?: number;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
