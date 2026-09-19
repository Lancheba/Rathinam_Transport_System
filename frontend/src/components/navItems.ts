import { Home, Map, Bus, Cpu, BarChart3, Radio, Settings } from "lucide-react";

/**
 * Single source of truth for app navigation.
 * `short` is the label used on the mobile bottom bar, where space is tight.
 * The first MOBILE_TAB_COUNT items become bottom tabs; the rest go under "More".
 */
export const navItems = [
  { to: "/dashboard",          label: "Dashboard",         short: "Home",     icon: Home },
  { to: "/dashboard/parking",  label: "Parking Map",       short: "Map",      icon: Map },
  { to: "/dashboard/buses",    label: "Bus Information",   short: "Buses",    icon: Bus },
  { to: "/dashboard/optimize", label: "Optimisation",      short: "Optimise", icon: Cpu },
  { to: "/dashboard/reports",  label: "Reports",           short: "Reports",  icon: BarChart3 },
  { to: "/dashboard/sensors",  label: "Sensor Monitoring", short: "Sensors",  icon: Radio },
  { to: "/dashboard/settings", label: "Settings",          short: "Settings", icon: Settings },
];

export const MOBILE_TAB_COUNT = 4;
