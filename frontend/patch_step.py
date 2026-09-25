import io

# 1. App.tsx: import the page and add the route
p1 = "src/App.tsx"
t1 = io.open(p1, encoding="utf-8").read()

old_imp = 'import AttendanceAnalyticsPage from "./pages/AttendanceAnalyticsPage";'
new_imp = 'import AttendanceAnalyticsPage from "./pages/AttendanceAnalyticsPage";\nimport AttendanceFlagsPage from "./pages/AttendanceFlagsPage";'
found_imp = t1.count(old_imp)
if found_imp == 1 and "AttendanceFlagsPage" not in t1.split("<Routes>")[0]:
    t1 = t1.replace(old_imp, new_imp, 1)

old_route = '                  <Route path="attendance-analytics" element={<AttendanceAnalyticsPage />} />'
new_route = '                  <Route path="attendance-analytics" element={<AttendanceAnalyticsPage />} />\n                  <Route path="attendance-flags" element={<AttendanceFlagsPage />} />'
found_route = t1.count(old_route)
if found_route == 1 and 'path="attendance-flags"' not in t1:
    t1 = t1.replace(old_route, new_route, 1)

io.open(p1, "w", encoding="utf-8", newline="").write(t1)
print("App.tsx -> import:", found_imp, "route:", found_route)

# 2. navItems.ts: add the sidebar link (staffOnly, same gate as Sensor Monitoring / Attendance Analytics)
p2 = "src/components/navItems.ts"
t2 = io.open(p2, encoding="utf-8").read()

old_icon_imp = 'import { Home, Map, Bus, Cpu, BarChart3, Radio, Settings, Users, MessageSquareWarning, ClipboardCheck, UserCheck, LineChart, QrCode } from "lucide-react";'
new_icon_imp = 'import { Home, Map, Bus, Cpu, BarChart3, Radio, Settings, Users, MessageSquareWarning, ClipboardCheck, UserCheck, LineChart, QrCode, ShieldAlert } from "lucide-react";'
found_icon = t2.count(old_icon_imp)
if found_icon == 1 and "ShieldAlert" not in t2.split("export const navItems")[0]:
    t2 = t2.replace(old_icon_imp, new_icon_imp, 1)

old_item = '  { to: "/dashboard/attendance-analytics", label: "Attendance Analytics", short: "Attend. Analytics", icon: LineChart, staffOnly: true },'
new_item = '  { to: "/dashboard/attendance-analytics", label: "Attendance Analytics", short: "Attend. Analytics", icon: LineChart, staffOnly: true },\n  // Automatic cheat-detection flags from Step 6 detection.py \x2014 staff/admin review only.\n  { to: "/dashboard/attendance-flags", label: "Attendance Flags", short: "Flags", icon: ShieldAlert, staffOnly: true },'
found_item = t2.count(old_item)
if found_item == 1 and 'attendance-flags' not in t2:
    t2 = t2.replace(old_item, new_item, 1)

io.open(p2, "w", encoding="utf-8", newline="").write(t2)
print("navItems.ts -> icon import:", found_icon, "nav item:", found_item)
