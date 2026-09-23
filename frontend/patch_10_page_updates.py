import pathlib, re

# ── 1. DriverAttendancePage.tsx — add QRDisplaySection above the tabs ────────
dp = pathlib.Path("src/pages/DriverAttendancePage.tsx")
content = dp.read_text(encoding="utf-8")

# Add import
old_import = 'import {\n  Bus as BusIcon, CalendarDays, CheckCircle2, XCircle, Download, ClipboardCheck,\n  LoaderCircle, History as HistoryIcon, Save,\n} from "lucide-react";'
new_import = (
    'import {\n'
    '  Bus as BusIcon, CalendarDays, CheckCircle2, XCircle, Download, ClipboardCheck,\n'
    '  LoaderCircle, History as HistoryIcon, Save,\n'
    '} from "lucide-react";\n'
    'import QRDisplaySection from "../components/QRDisplaySection";'
)
content = content.replace(old_import, new_import)

# Add QRDisplaySection above the tabs inside the bus-present branch
old_tabs = (
    '          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>\n'
    '            <button type="button" style={tabStyle(tab === "mark")} onClick={() => setTab("mark")}>\n'
    '              <CalendarDays size={14} /> Mark attendance\n'
    '            </button>\n'
    '            <button type="button" style={tabStyle(tab === "history")} onClick={() => setTab("history")}>\n'
    '              <HistoryIcon size={14} /> History\n'
    '            </button>\n'
    '          </div>'
)
new_tabs = (
    '          <QRDisplaySection />\n'
    '          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>\n'
    '            <button type="button" style={tabStyle(tab === "mark")} onClick={() => setTab("mark")}>\n'
    '              <CalendarDays size={14} /> Mark attendance\n'
    '            </button>\n'
    '            <button type="button" style={tabStyle(tab === "history")} onClick={() => setTab("history")}>\n'
    '              <HistoryIcon size={14} /> History\n'
    '            </button>\n'
    '          </div>'
)
content = content.replace(old_tabs, new_tabs)
dp.write_text(content, encoding="utf-8")
print("Updated: src/pages/DriverAttendancePage.tsx")

# ── 2. MyAttendancePage.tsx — add Scan button + Face Enrollment link ─────────
mp = pathlib.Path("src/pages/MyAttendancePage.tsx")
content = mp.read_text(encoding="utf-8")

# Add useNavigate import
old_react = 'import React, { useCallback, useEffect, useState } from "react";'
new_react = 'import React, { useCallback, useEffect, useState } from "react";\nimport { useNavigate } from "react-router-dom";'
content = content.replace(old_react, new_react)

# Add useNavigate() call right after the component function opens
old_fn_open = '  return (\n    <div style={{ padding: "8px 4px 32px", maxWidth: 720 }}>\n      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-strong)", margin: "0 0 4px" }}>My Attendance</h1>\n      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px" }}>\n        Whether you were marked present or absent on your bus, straight from your driver\'s attendance sheet.\n      </p>'
new_fn_open = (
    '  const navigate = useNavigate();\n'
    '\n'
    '  // Show Scan button only when a window is open\n'
    '  const windowOpen = (() => {\n'
    '    const h = new Date().getHours();\n'
    '    return (h >= 5 && h < 10) || (h >= 16 && h < 20);\n'
    '  })();\n'
    '\n'
    '  return (\n'
    '    <div style={{ padding: "8px 4px 32px", maxWidth: 720 }}>\n'
    '      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>\n'
    '        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-strong)", margin: 0 }}>My Attendance</h1>\n'
    '        {windowOpen && (\n'
    '          <button onClick={() => navigate("/dashboard/scan-attendance")}\n'
    '            style={{ padding: "8px 16px", background: "#2563eb", color: "#fff",\n'
    '                     borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>\n'
    '            📷 Scan QR Attendance\n'
    '          </button>\n'
    '        )}\n'
    '      </div>\n'
    '      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 12px" }}>\n'
    '        Whether you were marked present or absent on your bus, straight from your driver\'s attendance sheet.\n'
    '      </p>\n'
    '      <button onClick={() => navigate("/dashboard/face-enrollment")}\n'
    '        style={{ fontSize: 13, color: "var(--accent-indigo, #6366f1)", background: "none",\n'
    '                 border: "none", cursor: "pointer", padding: 0, marginBottom: 16 }}>\n'
    '        🪪 Update my Face ID\n'
    '      </button>'
)
content = content.replace(old_fn_open, new_fn_open)
mp.write_text(content, encoding="utf-8")
print("Updated: src/pages/MyAttendancePage.tsx")
