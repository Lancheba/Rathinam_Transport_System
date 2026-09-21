import { Home, Map, Bus, Cpu, BarChart3, Radio, Settings, Users, MessageSquareWarning } from "lucide-react";

/**
 * Single source of truth for app navigation.
 * `short` is the label used on the mobile bottom bar, where space is tight.
 * The first MOBILE_TAB_COUNT items become bottom tabs; the rest go under "More".
 */
export const navItems = [
  { to: "/dashboard",          label: "Dashboard",         short: "Home",     icon: Home },
  { to: "/dashboard/parking",  label: "Parking Map",       short: "Map",      icon: Map },
  { to: "/dashboard/buses",    label: "Bus Information",   short: "Buses",    icon: Bus },
  // Roll numbers, phone numbers etc. are personal data — only admins/transport staff see this link.
  // The API enforces this too, so hiding the link is just for a clean menu, not the real gate.
  { to: "/dashboard/students", label: "Students",          short: "Students", icon: Users, staffOnly: true },
  // Preview run is harmless, but applying a layout change is staff-only — keep the whole
  // feature out of the student's menu so it doesn't look like something they can do.
  { to: "/dashboard/optimize", label: "Optimisation",      short: "Optimise", icon: Cpu, staffOnly: true },
  { to: "/dashboard/reports",  label: "Reports",           short: "Reports",  icon: BarChart3 },
  // Sensor health/wiring detail isn't something a student needs to see or act on.
  { to: "/dashboard/sensors",  label: "Sensor Monitoring", short: "Sensors",  icon: Radio, staffOnly: true },
  // Everyone signed in can send a complaint or feedback; only admins see the inbox inside the page.
  { to: "/dashboard/feedback", label: "Complaints & Feedback", short: "Feedback", icon: MessageSquareWarning },
  { to: "/dashboard/settings", label: "Settings",          short: "Settings", icon: Settings },
];

export const MOBILE_TAB_COUNT = 4;
