"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("pc-theme", next);
    setTheme(next);
  }

  return (
    <button type="button" onClick={toggle} className="rounded-full border border-line bg-card px-3 py-2 text-sm font-semibold text-ink">
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
