import { Home, Map, Bus, Cpu, BarChart3, Radio, Settings, Users, MessageSquareWarning, ClipboardCheck, UserCheck, LineChart, QrCode, ShieldAlert, UserCog, FileText } from "lucide-react";

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
  { to: "/dashboard/students", label: "Cab Rosters",        short: "Rosters",  icon: Users, staffOnly: true },
  { to: "/dashboard/people", label: "People", short: "People", icon: UserCog, staffOnly: true },
  // Preview run is harmless, but applying a layout change is staff-only — keep the whole
  // feature out of the student's menu so it doesn't look like something they can do.
  { to: "/dashboard/optimize", label: "Optimisation",      short: "Optimise", icon: Cpu, staffOnly: true },
  // Marking students/teachers present or absent only makes sense for the driver of that bus.
  { to: "/dashboard/attendance", label: "Attendance",      short: "Attend",   icon: ClipboardCheck, driverOnly: true },
  // A driver's own cab roster — separate from the staff-wide "Students" link above,
  // and scoped by the API to their own bus only.
  { to: "/dashboard/my-students", label: "My Students",    short: "Roster",   icon: Users, driverOnly: true },
  // The driver's own cab: full bus details plus maintenance/fuel log.
  { to: "/dashboard/my-bus", label: "My Bus", short: "My Bus", icon: Bus, driverOnly: true },
  // Cab In-Charge runs QR attendance for their own bus.
  { to: "/dashboard/incharge-attendance", label: "Take Attendance", short: "Attend", icon: QrCode, inchargeOnly: true, standInOk: true },
  // Cab In-Charge's own bus roster, scoped by the API to their assigned bus only.
  { to: "/dashboard/incharge-students", label: "My Bus", short: "My Bus", icon: Users, inchargeOnly: true, standInOk: true },
  // A student's own present/absent record, taken by their bus's driver — only
  // makes sense for STUDENT-role accounts (staff/admin/driver see the real roster instead).
  { to: "/dashboard/my-attendance", label: "My Attendance", short: "Attend",  icon: UserCheck, studentOnly: true },
  { to: "/dashboard/reports",  label: "Reports",           short: "Reports",  icon: BarChart3 },
  { to: "/dashboard/attendance-report", label: "Attendance Report", short: "Report", icon: FileText },
  // Attendance analytics (cohort trend, per-student drill-down) is a management view, not a driver task.
  { to: "/dashboard/attendance-analytics", label: "Attendance Analytics", short: "Attend. Analytics", icon: LineChart, staffOnly: true },
  // Automatic cheat-detection flags from Step 6 detection.py  14 staff/admin review only.
  { to: "/dashboard/attendance-flags", label: "Attendance Flags", short: "Flags", icon: ShieldAlert, staffOnly: true },
  // Sensor health/wiring detail isn't something a student needs to see or act on.
  { to: "/dashboard/sensors",  label: "Sensor Monitoring", short: "Sensors",  icon: Radio, staffOnly: true },
  // Everyone signed in can send a complaint or feedback; only admins see the inbox inside the page.
  { to: "/dashboard/feedback", label: "Complaints & Feedback", short: "Feedback", icon: MessageSquareWarning },
  { to: "/dashboard/settings", label: "Settings",          short: "Settings", icon: Settings },
];

export const MOBILE_TAB_COUNT = 4;
