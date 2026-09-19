import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface ThemeToggleProps {
  /** "icon" = round icon button for the app bar; "pill" = labelled pill for the landing page */
  variant?: "icon" | "pill";
  className?: string;
}

/** One-tap light / dark switch. Shows the mode you will switch TO. */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = "icon", className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const goingTo = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  const label = `Switch to ${goingTo} mode`;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className={`theme-toggle theme-toggle--pill ${className}`.trim()}
      >
        <Icon size={14} />
        <span>{theme === "dark" ? "Light" : "Dark"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`tn__icon-btn theme-toggle theme-toggle--icon ${className}`.trim()}
    >
      <Icon size={16} />
    </button>
  );
};
