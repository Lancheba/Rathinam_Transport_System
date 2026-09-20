import { Megaphone, TriangleAlert, Siren } from "lucide-react";
import type { AnnouncementPriority } from "../types";
import { alpha } from "../utils/color";

/** How each priority looks. Colours are theme variables, so they follow light/dark mode. */
export const PRIORITY_META: Record<
  AnnouncementPriority,
  { label: string; icon: typeof Megaphone; color: string; bg: string }
> = {
  INFO:      { label: "Info",      icon: Megaphone,     color: "var(--text-soft)",    bg: "rgb(var(--ov) / 0.12)" },
  IMPORTANT: { label: "Important", icon: TriangleAlert, color: "var(--accent-amber)", bg: alpha("var(--accent-amber)", 16) },
  URGENT:    { label: "Urgent",    icon: Siren,         color: "var(--accent-red)",   bg: alpha("var(--accent-red)", 16) },
};
