"use client";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
        theme === "dark" ? "bg-violet-500/30" : "bg-gray-200"
      } ${className}`}
      aria-label="Toggle theme"
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center text-[10px] ${
          theme === "dark" ? "left-0.5" : "left-[18px]"
        }`}
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </div>
    </button>
  );
}
