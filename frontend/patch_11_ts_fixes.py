import pathlib, re

# 1. QRDisplaySection.tsx — remove unused React import
p = pathlib.Path("src/components/QRDisplaySection.tsx")
c = p.read_text(encoding="utf-8")
c = c.replace(
    'import React, { useState, useEffect, useRef } from "react";',
    'import { useState, useEffect, useRef } from "react";'
)
p.write_text(c, encoding="utf-8")
print("Fixed: src/components/QRDisplaySection.tsx")

# 2. FaceEnrollmentPage.tsx — remove unused React + modelsLoaded
p = pathlib.Path("src/pages/FaceEnrollmentPage.tsx")
c = p.read_text(encoding="utf-8")
c = c.replace(
    'import React, { useRef, useState, useEffect } from "react";',
    'import { useRef, useState, useEffect } from "react";'
)
c = c.replace(
    '  const [modelsLoaded, setModelsLoaded] = useState(false);\n',
    ''
)
c = c.replace(
    '    setModelsLoaded(true);\n',
    ''
)
p.write_text(c, encoding="utf-8")
print("Fixed: src/pages/FaceEnrollmentPage.tsx")

# 3. ScanAttendancePage.tsx — remove unused React import
p = pathlib.Path("src/pages/ScanAttendancePage.tsx")
c = p.read_text(encoding="utf-8")
c = c.replace(
    'import React, { useRef, useState, useEffect, useCallback } from "react";',
    'import { useRef, useState, useEffect, useCallback } from "react";'
)
p.write_text(c, encoding="utf-8")
print("Fixed: src/pages/ScanAttendancePage.tsx")
