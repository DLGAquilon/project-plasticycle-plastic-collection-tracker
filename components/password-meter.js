"use client";

import { assessPassword } from "../lib/password-strength.js";

const FILL = {
  empty: "w-0",
  weak: "w-1/3 bg-clay",
  okay: "w-2/3 bg-accent",
  strong: "w-full bg-forest",
};

const LABEL = {
  empty: "Enter a password",
  weak: "Weak",
  okay: "Okay",
  strong: "Strong",
};

export default function PasswordMeter({ password }) {
  const result = assessPassword(password);
  const score = result.level === "strong" ? 3 : result.level === "okay" ? 2 : result.level === "weak" ? 1 : 0;

  return (
    <div className="mt-2">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={score}
        aria-valuetext={LABEL[result.level]}
      >
        <div className={`h-full rounded-full transition-all ${FILL[result.level]}`} />
      </div>
      <p className="mt-1 text-xs font-semibold text-muted">{LABEL[result.level]}</p>
      <ul className="mt-2 space-y-1 text-xs">
        {result.rules.map((rule) => (
          <li key={rule.id} className={rule.met ? "text-forest" : "text-muted"}>
            {rule.met ? "Met" : "Still needed"}: {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
