"use client";

import React from "react";
import { fmtMoney } from "@/lib/utils";

/* ---------------- Donut ---------------- */

export function Donut({
  data,
  size = 168,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#c6ccd8"
            strokeWidth={thickness}
            opacity={0.4}
          />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * c;
            const off = -acc * c;
            acc += frac;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(dash - 2.5, 0.5)} ${c}`}
                strokeDashoffset={off}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset .5s ease" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-ink">
            {centerValue ?? total}
          </span>
          {centerLabel && (
            <span className="px-4 text-center text-[10px] font-semibold uppercase tracking-wide text-faint">
              {centerLabel}
            </span>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: d.color }}
            />
            <span className="flex-1 truncate font-semibold text-sub">
              {d.label}
            </span>
            <span className="font-bold text-ink">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Horizontal bars ---------------- */

export function HBars({
  data,
  money,
}: {
  data: { label: string; value: number; color?: string }[];
  money?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0)
    return <p className="py-6 text-center text-xs text-faint">No data yet</p>;
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-semibold text-sub">{d.label}</span>
            <span className="shrink-0 font-bold text-ink">
              {money ? fmtMoney(d.value) : d.value}
            </span>
          </div>
          <div className="neu-inset-sm h-3.5 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max((d.value / max) * 100, 2)}%`,
                background: d.color ?? "#2f6bff",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Area chart ---------------- */

export function AreaChart({
  data,
  height = 190,
  money,
}: {
  data: { label: string; value: number }[];
  height?: number;
  money?: boolean;
}) {
  const w = 560;
  const h = height;
  const px = 10;
  const py = 16;
  const max = Math.max(...data.map((d) => d.value), 1);
  const xs = data.map(
    (_, i) => px + (i * (w - 2 * px)) / Math.max(data.length - 1, 1)
  );
  const ys = data.map((d) => h - py - (d.value / max) * (h - 2 * py));
  let path = `M ${xs[0] ?? px} ${ys[0] ?? h - py}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2;
    path += ` C ${cx} ${ys[i]}, ${cx} ${ys[i + 1]}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  const area = `${path} L ${xs[xs.length - 1] ?? w - px} ${h - py + 6} L ${
    xs[0] ?? px
  } ${h - py + 6} Z`;
  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lfAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f6bff" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#2f6bff" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={px}
            x2={w - px}
            y1={h - py - f * (h - 2 * py)}
            y2={h - py - f * (h - 2 * py)}
            stroke="#c6ccd8"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.55}
          />
        ))}
        <path d={area} fill="url(#lfAreaFill)" />
        <path
          d={path}
          fill="none"
          stroke="#2f6bff"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {xs.map((x, i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={ys[i]}
              r={4}
              fill="#e0e5ec"
              stroke="#2f6bff"
              strokeWidth={2}
            >
              <title>
                {data[i].label}:{" "}
                {money ? fmtMoney(data[i].value) : data[i].value}
              </title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-0.5 text-[10px] font-semibold text-faint">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Sparkline ---------------- */

export function Sparkline({
  values,
  color = "#2f6bff",
  width = 96,
  height = 30,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) values = [0, ...values, 0];
  const max = Math.max(...values, 1);
  const xs = values.map((_, i) => (i * width) / (values.length - 1));
  const ys = values.map((v) => height - 3 - (v / max) * (height - 6));
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2;
    d += ` C ${cx} ${ys[i]}, ${cx} ${ys[i + 1]}, ${xs[i + 1]} ${ys[i + 1]}`;
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
