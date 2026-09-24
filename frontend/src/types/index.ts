// Types for the Smart Bus Parking System

export interface Bus {
  id: number;
  bus_number: string;
  rfid_uid: string;
  route: string;
  departure_time: string;
  length_m: string;
  width_m: string;
  is_active: boolean;
  parking_slot_info: {
    row: string;
    slot_number: number;
    is_blocked: boolean;
  } | null;
  /** Username of the driver linked to this bus, if any (set via the driver's "My Bus" setup) */
  driver_username?: string | null;
  driver_phone?: string | null;
  incharge_username?: string | null;
  incharge_phone?: string | null;
  student_capacity?: number;
  teacher_capacity?: number;
}

/** Fields the "Add bus" form sends to POST /api/buses/ */
export interface BusInput {
  bus_number: string;
  rfid_uid: string;
  route: string;
  departure_time: string; // "HH:MM"
  length_m: string;
  width_m: string;
  is_active: boolean;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  role: "ADMIN" | "STAFF" | "DRIVER" | "STUDENT" | "INCHARGE";
  /** Underlying Student/Teacher identity, separate from role. Null until the one-time prompt is answered. */
  identity?: "STUDENT" | "TEACHER" | null;
  can_manage_buses: boolean;
  /** Administrators only (not transport staff): may read complaints and feedback */
  is_admin: boolean;
  /** Bus number this driver is linked to, if role is DRIVER and a bus has been claimed */
  driven_bus_number?: string | null;
  /** Bus number this in-charge is linked to, if role is INCHARGE and a bus has been assigned */
  incharge_bus_number?: string | null;
}

export interface ParkingSlot {
  id: number;
  ground: number;
  row: string;
  slot_number: number;
  x_position_m: string;
  y_position_m: string;
  is_occupied: boolean;
  is_blocked: boolean;
  bus: number | null;
  bus_number: string | null;
  bus_departure: string | null;
  bus_route: string | null;
}

export interface ParkingGround {
  id: number;
  name: string;
  length_m: string;
  width_m: string;
  entrance_width_m: string;
  exit_width_m: string;
  total_slots: number;
}

export interface Sensor {
  id: number;
  sensor_id: string;
  sensor_type: "RFID" | "ULTRASONIC" | "CAMERA";
  location: string;
  is_active: boolean;
  last_reading: string | null;
  last_seen: string | null;
}

export interface ParkingEvent {
  id: number;
  bus: number;
  bus_number: string;
  sensor: number | null;
  parking_slot: number | null;
  slot_label: string | null;
  event_type: string;
  message: string;
  timestamp: string;
}

export interface ParkingSummary {
  total_slots: number;
  occupied: number;
  free: number;
  blocked: number;
  utilisation_pct: number;
}

export interface OptimizationSlot {
  slot_id: number;
  label: string;
  row: string;
  slot_number: number;
  x: number;
  y: number;
  bus_id: number;
  bus_number: string;
  departure_time: string;
  is_blocked: boolean;
}

export interface OptimizationResult {
  id: number;
  stats: {
    blocked_before: number;
    blocked_after: number;
    movements_required: number;
    buses_optimised: number;
  };
  current: OptimizationSlot[];
  recommended: OptimizationSlot[];
}

/** Fields the "Add sensor" form sends to POST /api/sensors/ */
export interface SensorInput {
  sensor_id: string;
  sensor_type: "RFID" | "ULTRASONIC" | "CAMERA";
  location: string;
  is_active: boolean;
}

export type AnnouncementPriority = "INFO" | "IMPORTANT" | "URGENT";

export interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  author_name: string;
  author_role: string;
  /** True when the signed-in user may delete this notice (server enforces it too) */
  can_edit: boolean;
  created_at: string;
  updated_at: string;
}

/** Fields the "New announcement" form sends to POST /api/announcements/ */
export interface AnnouncementInput {
  title: string;
  message: string;
  priority: AnnouncementPriority;
}


export interface Student {
  id: number;
  name: string;
  roll_number: string;
  department: string;
  year: 1 | 2 | 3 | 4 | null;
  phone: string;
  email: string;
  boarding_point: string;
  bus: number | null;
  bus_number: string | null;
  bus_route: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields the "Add student" form sends to POST /api/students/ */
export interface StudentInput {
  name: string;
  roll_number: string;
  department: string;
  year: 1 | 2 | 3 | 4 | null;
  phone: string;
  email: string;
  boarding_point: string;
  bus: number | null;
}

/** One row of GET /api/students/roster/ — a bus and everyone riding it */
export interface BusRoster {
  bus_id: number;
  bus_number: string;
  route: string;
  student_count: number;
  students: Pick<Student, "id" | "name" | "roll_number" | "department" | "year" | "phone" | "boarding_point">[];
}

/** GET /api/students/summary/ — aggregate counts only, no student PII */
export interface StudentSummary {
  total: number;
  assigned: number;
  unassigned: number;
  buses_with_students: number;
}

/** A vehicle the camera (YOLO) is currently following. bus is null until it is identified. */
export interface VisionTrack {
  id: number;
  camera_id: string;
  track_id: number;
  bus: number | null;
  bus_number: string | null;
  slot: number | null;
  slot_label: string | null;
  x_m: number;
  y_m: number;
  confidence: number;
  frames_seen: number;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
}

// ---- Complaints & feedback (anyone signed in can send; only admins can read) ----
export type FeedbackKind = "COMPLAINT" | "FEEDBACK" | "SUGGESTION";
export type FeedbackCategory = "BUS" | "DRIVER" | "ROUTE" | "PARKING" | "APP" | "OTHER";
export type FeedbackStatus = "NEW" | "IN_REVIEW" | "RESOLVED";

/** Fields the "Send" form posts to POST /api/feedback/ */
export interface FeedbackInput {
  kind: FeedbackKind;
  category: FeedbackCategory;
  subject: string;
  message: string;
  bus: number | null;
  is_anonymous: boolean;
}

/** What administrators get back from GET /api/feedback/ */
export interface Feedback {
  id: number;
  kind: FeedbackKind;
  kind_label: string;
  category: FeedbackCategory;
  category_label: string;
  subject: string;
  message: string;
  bus: number | null;
  bus_number: string | null;
  author_name: string;
  author_role: string;
  is_anonymous: boolean;
  status: FeedbackStatus;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

// ---- Driver attendance: "my bus" setup, roster, sessions ----

export interface Teacher {
  id: number;
  name: string;
  staff_id: string;
  department: string;
  phone: string;
  email: string;
  boarding_point: string;
  bus: number | null;
  bus_number: string | null;
  created_at: string;
  updated_at: string;
}

/** GET/POST/PATCH /api/attendance/my-bus/ */
export interface DriverBusResponse {
  bus: Bus | null;
}

export type AttendanceStatus = "PRESENT" | "ABSENT";
export type AttendanceSlot = "MORNING" | "EVENING";
export type AttendanceSource = "MANUAL" | "QR_FACE" | "AUTO_ABSENT";

/** GET/PATCH /api/attendance/window-config/ — when the MORNING/EVENING
 * attendance-taking windows open & close. Times are "HH:MM:SS" strings.
 * Admins and transport staff can edit; everyone else can read. */
export interface AttendanceWindowConfig {
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  updated_by_username: string | null;
  updated_at: string;
}

export interface AttendanceRosterPerson {
  id: number;
  name: string;
  roll_number?: string;
  staff_id?: string;
  status: AttendanceStatus | null;
  locked: boolean;
}

/** GET /api/attendance/roster/ — today's (or a given date's) roster to mark */
export interface AttendanceRoster {
  bus_id: number;
  bus_number: string;
  date: string;
  slot: AttendanceSlot;
  is_holiday: boolean;
  holiday_reason: string;
  already_marked: boolean;
  students: AttendanceRosterPerson[];
  teachers: AttendanceRosterPerson[];
}

export interface AttendanceRecordInput {
  person_type: "STUDENT" | "TEACHER";
  id: number;
  status: AttendanceStatus;
  remarks?: string;
}

/** Body sent to POST /api/attendance/submit/ */
export interface AttendanceSubmitInput {
  date: string;
  slot?: AttendanceSlot;
  is_holiday?: boolean;
  holiday_reason?: string;
  records?: AttendanceRecordInput[];
}

export interface AttendanceRecord {
  id: number;
  person_type: "STUDENT" | "TEACHER";
  student: number | null;
  teacher: number | null;
  status: AttendanceStatus;
  remarks: string;
  source: AttendanceSource;
  marked_at: string | null;
  face_match_score: number | null;
  locked: boolean;
  is_correction: boolean;
  corrected_at: string | null;
  name: string | null;
  identifier: string | null;
}

/* ------------------------------------------------------------ Attendance analytics */

export type AnalyticsPeriod = "monthly" | "yearly";

export interface AttendanceTrendPoint {
  label: string;
  present: number;
  total: number;
  pct: number;
}

export interface AttendanceBusBreakdown {
  bus_id: number;
  bus_number: string;
  present: number;
  total: number;
  pct: number;
}

export interface AttendanceTopAbsentee {
  student_id: number;
  name: string;
  roll_number: string;
  absences: number;
}

/** GET /api/attendance/analytics/overview/ */
export interface AttendanceAnalyticsOverview {
  period: AnalyticsPeriod;
  year: number;
  month: number | null;
  overall_pct: number;
  present_count: number;
  absent_count: number;
  total_count: number;
  trend: AttendanceTrendPoint[];
  by_bus: AttendanceBusBreakdown[];
  top_absentees: AttendanceTopAbsentee[];
}

export interface AttendanceCalendarDay {
  id: number;
  date: string;
  status: AttendanceStatus;
  is_correction: boolean;
  locked: boolean;
}

/** GET /api/attendance/analytics/student/<id>/ */
export interface AttendanceStudentAnalytics {
  student: { id: number; name: string; roll_number: string };
  year: number;
  month: number | null;
  present_count: number;
  absent_count: number;
  total_count: number;
  attendance_pct: number;
  calendar: AttendanceCalendarDay[];
  longest_absence_streak: number;
}

// ---- Student self-service: link my login to my roster row, and my own attendance ----

/** GET/POST/DELETE /api/students/me/ */
export interface MyStudentLink {
  linked: boolean;
  student: {
    id: number;
    name: string;
    roll_number: string;
    department: string;
    year: 1 | 2 | 3 | 4 | null;
    bus_number: string | null;
    boarding_point: string;
  } | null;
}

export interface MyAttendanceDay {
  date: string;
  status: AttendanceStatus | null;
  is_holiday: boolean;
  holiday_reason: string;
  marked: boolean;
  source: AttendanceSource | null;
}

/** GET /api/attendance/my/ — the signed-in student's own present/absent record */
export interface MyAttendanceSlotBlock {
  today: MyAttendanceDay;
  recent: MyAttendanceDay[];
}

export interface MyAttendance {
  linked: boolean;
  student: { id: number; name: string; roll_number: string } | null;
  bus_number?: string | null;
  morning: MyAttendanceSlotBlock;
  evening: MyAttendanceSlotBlock;
}

/* ------------------------------------------------------------ Maintenance */

export type MaintenanceLogType = "SERVICE" | "FUEL";

export interface MaintenanceLog {
  id: number;
  bus: number;
  bus_number: string;
  log_type: MaintenanceLogType;
  date: string;
  odometer_km: number | null;
  cost: string | null;
  fuel_liters: string | null;
  notes: string;
  logged_by_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLogInput {
  log_type: MaintenanceLogType;
  date: string;
  odometer_km: number | null;
  cost: string | null;
  fuel_liters: string | null;
  notes: string;
}

/** GET /api/maintenance/logs/summary/ — most recent service + most recent fuel entry */
export interface MaintenanceSummary {
  bus: number | null;
  last_service: MaintenanceLog | null;
  last_fuel: MaintenanceLog | null;
}

/** One row of GET /api/attendance/sessions/ — a past day's attendance for a bus */
export interface AttendanceSession {
  id: number;
  bus: number;
  bus_number: string;
  date: string;
  is_holiday: boolean;
  holiday_reason: string;
  marked_by_username: string | null;
  records: AttendanceRecord[];
  present_count: number;
  absent_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
}
