"use client";

import { BarChart3, EyeOff, Unlink } from "lucide-react";
import { useState } from "react";

const points = [
  {
    title: "Fragmented Tracking",
    detail: "Puroks, departments, and sponsors each keep a separate list, so the kilograms never become one ranking.",
    icon: Unlink,
  },
  {
    title: "Low Long-Term Engagement",
    detail: "A cleanup day fills a sack, then the habit fades because there is no standing contest to return to.",
    icon: BarChart3,
  },
  {
    title: "The ESG Reporting Blindspot",
    detail: "A spreadsheet cannot show who collected the plastic, so a campus or company cannot stand behind the number.",
    icon: EyeOff,
  },
];

export default function ProblemGrid() {
  const [active, setActive] = useState(0);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {points.map((point, index) => {
        const Icon = point.icon;
        const selected = active === index;
        return (
          <button
            key={point.title}
            type="button"
            aria-pressed={selected}
            onClick={() => setActive(index)}
            className={`rounded-3xl border p-6 text-left transition ${selected ? "border-forest bg-card shadow-sm" : "border-line bg-paper hover:-translate-y-0.5"}`}
          >
            <Icon className={`h-8 w-8 ${selected ? "text-forest" : "text-muted"}`} />
            <h3 className="mt-4 text-xl font-bold">{point.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{point.detail}</p>
          </button>
        );
      })}
    </div>
  );
}
