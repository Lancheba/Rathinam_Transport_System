import { Home, Map, Bus, Cpu, BarChart3, Radio, Settings, Users, MessageSquareWarning, ClipboardCheck, UserCheck } from "lucide-react";

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
  // Marking students/teachers present or absent only makes sense for the driver of that bus.
  { to: "/dashboard/attendance", label: "Attendance",      short: "Attend",   icon: ClipboardCheck, driverOnly: true },
  // A driver's own cab roster — separate from the staff-wide "Students" link above,
  // and scoped by the API to their own bus only.
  { to: "/dashboard/my-students", label: "My Students",    short: "Roster",   icon: Users, driverOnly: true },
  // A student's own present/absent record, taken by their bus's driver — only
  // makes sense for STUDENT-role accounts (staff/admin/driver see the real roster instead).
  { to: "/dashboard/my-attendance", label: "My Attendance", short: "Attend",  icon: UserCheck, studentOnly: true },
  { to: "/dashboard/reports",  label: "Reports",           short: "Reports",  icon: BarChart3 },
  // Sensor health/wiring detail isn't something a student needs to see or act on.
  { to: "/dashboard/sensors",  label: "Sensor Monitoring", short: "Sensors",  icon: Radio, staffOnly: true },
  // Everyone signed in can send a complaint or feedback; only admins see the inbox inside the page.
  { to: "/dashboard/feedback", label: "Complaints & Feedback", short: "Feedback", icon: MessageSquareWarning },
  { to: "/dashboard/settings", label: "Settings",          short: "Settings", icon: Settings },
];

export const MOBILE_TAB_COUNT = 4;
