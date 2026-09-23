import pathlib, re

p = pathlib.Path("src/App.tsx")
content = p.read_text(encoding="utf-8")

# 1. Add imports after MyAttendancePage import
old_import = 'import MyAttendancePage from "./pages/MyAttendancePage";'
new_import = (
    'import MyAttendancePage from "./pages/MyAttendancePage";\n'
    'import FaceEnrollmentPage from "./pages/FaceEnrollmentPage";\n'
    'import ScanAttendancePage from "./pages/ScanAttendancePage";'
)
content = content.replace(old_import, new_import)

# 2. Add routes after my-attendance route
old_route = '                  <Route path="my-attendance" element={<MyAttendancePage />} />'
new_route = (
    '                  <Route path="my-attendance" element={<MyAttendancePage />} />\n'
    '                  <Route path="face-enrollment" element={<FaceEnrollmentPage />} />\n'
    '                  <Route path="scan-attendance" element={<ScanAttendancePage />} />'
)
content = content.replace(old_route, new_route)

p.write_text(content, encoding="utf-8")
print("Updated: src/App.tsx")
