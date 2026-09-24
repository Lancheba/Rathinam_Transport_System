import re, sys

def swap(c, old, new, label):
    n = c.count(old)
    if n != 1:
        raise SystemExit(f"STOP: {label}: expected 1 match, found {n}. Nothing was written.")
    print("ok  ", label)
    return c.replace(old, new, 1)

# ---- services.py --------------------------------------------------------
s = open('attendance/services.py', encoding='utf-8').read()
s = swap(s,
    "def _active_bus_ids():\n",
    "def get_windows():\n"
    "    \"\"\"\n"
    "    The ONE place the MORNING/EVENING windows come from: the admin-editable\n"
    "    AttendanceWindowConfig (Settings page). Returns\n"
    "    {\"MORNING\": (start, end), \"EVENING\": (start, end)} as datetime.time values.\n"
    "    \"\"\"\n"
    "    cfg = AttendanceWindowConfig.get_solo()\n"
    "    return {\n"
    "        \"MORNING\": (cfg.morning_start, cfg.morning_end),\n"
    "        \"EVENING\": (cfg.evening_start, cfg.evening_end),\n"
    "    }\n"
    "\n"
    "\n"
    "def _active_bus_ids():\n",
    "get_windows helper")
s = swap(s,
    "    cfg = AttendanceWindowConfig.get_solo()\n"
    "    ends = ((\"MORNING\", cfg.morning_end), (\"EVENING\", cfg.evening_end))\n",
    "    ends = tuple((slot, end) for slot, (_start, end) in get_windows().items())\n",
    "clock uses get_windows")

# ---- qr_views.py --------------------------------------------------------
q = open('attendance/qr_views.py', encoding='utf-8').read()
q = swap(q,
    "from attendance.services import is_school_day\n",
    "from attendance.services import get_windows, is_school_day\n",
    "qr_views import")
q = swap(q,
    "    now = timezone.localtime(timezone.now())\n"
    "    t = now.time()\n"
    "    cfg = AttendanceWindowConfig.get_solo()\n"
    "    if cfg.morning_start <= t <= cfg.morning_end:\n"
    "        return 'MORNING'\n"
    "    if cfg.evening_start <= t <= cfg.evening_end:\n"
    "        return 'EVENING'\n"
    "    return None\n",
    "    t = timezone.localtime(timezone.now()).time()\n"
    "    for slot, (start, end) in get_windows().items():\n"
    "        if start <= t <= end:\n"
    "            return slot\n"
    "    return None\n",
    "_current_slot uses get_windows")
q = swap(q,
    "    cfg = AttendanceWindowConfig.get_solo()\n"
    "    end_t = cfg.morning_end if slot == 'MORNING' else cfg.evening_end\n",
    "    end_t = get_windows()[slot][1]\n",
    "_slot_window_end uses get_windows")
q = swap(q,
    "    cfg = AttendanceWindowConfig.get_solo()\n"
    "    fmt = lambda t: t.strftime('%H:%M')\n",
    "    w = get_windows()\n"
    "    fmt = lambda t: t.strftime('%H:%M')\n",
    "qr_window uses get_windows (1)")
q = swap(q,
    "        'morning': [fmt(cfg.morning_start), fmt(cfg.morning_end)],\n"
    "        'evening': [fmt(cfg.evening_start), fmt(cfg.evening_end)],\n",
    "        'morning': [fmt(t) for t in w['MORNING']],\n"
    "        'evening': [fmt(t) for t in w['EVENING']],\n",
    "qr_window uses get_windows (2)")

# ---- settings.py --------------------------------------------------------
t = open('config/settings.py', encoding='utf-8').read()
t, n = re.subn(r"^ATTENDANCE_(?:MORNING|EVENING)_WINDOW\s*=.*\n", "", t, flags=re.M)
if n != 2:
    raise SystemExit(f"STOP: expected to remove 2 unused window settings, found {n}. Nothing was written.")
print("ok   removed unused ATTENDANCE_*_WINDOW settings")
t = swap(t,
    "FACE_MATCH_THRESHOLD = 0.6\n",
    "# MORNING/EVENING attendance windows are edited in the app (Settings page);\n"
    "# code reads them through attendance.services.get_windows().\n"
    "FACE_MATCH_THRESHOLD = 0.6\n",
    "settings comment")

open('attendance/services.py', 'w', encoding='utf-8').write(s)
open('attendance/qr_views.py', 'w', encoding='utf-8').write(q)
open('config/settings.py', 'w', encoding='utf-8').write(t)
print("Done.")
