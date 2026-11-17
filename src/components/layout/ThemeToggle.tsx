"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/icons";

type Theme = "system" | "light" | "dark";
const order: Theme[] = ["system", "light", "dark"];
const labels: Record<Theme, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    let saved: Theme = "system";
    try {
      saved = (localStorage.getItem("bp_theme") as Theme) || "system";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(order.includes(saved) ? saved : "system");
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let current: Theme = "system";
      try {
        current = (localStorage.getItem("bp_theme") as Theme) || "system";
      } catch {}
      if (current === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const next = order[(order.indexOf(theme) + 1) % order.length];
  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next);
        try {
          localStorage.setItem("bp_theme", next);
        } catch {}
        apply(next);
      }}
      className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
      aria-label={`${labels[theme]} (switch to ${labels[next].toLowerCase()})`}
      title={labels[theme]}
    >
      <Icon />
    </button>
  );
}
