import { useState, useEffect } from "react";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("stockwatch-theme") as Theme | null;
  return stored === "light" ? "light" : "dark";
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("stockwatch-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
