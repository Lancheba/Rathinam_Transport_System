import api from "./client";
import type {
  Bus, BusInput, CurrentUser, ParkingSlot, ParkingGround, Sensor,
  ParkingEvent, ParkingSummary, OptimizationResult, SensorInput,
  Announcement, AnnouncementInput, Feedback, FeedbackInput, FeedbackStatus, VisionTrack, Student, StudentInput, BusRoster, StudentSummary,
  DriverBusResponse, AttendanceRoster, AttendanceSubmitInput, AttendanceSession, MyStudentLink, MyAttendance, AttendanceSlot,
  MaintenanceLog, MaintenanceLogInput, MaintenanceLogType, MaintenanceSummary,
  AttendanceRecord, AttendanceAnalyticsOverview, AttendanceStudentAnalytics, AnalyticsPeriod,
  AttendanceWindowConfig,
  AttendanceFlag, AttendanceFlagStatus, AttendanceFlagReviewInput,
  Teacher, TeacherInput, TeacherLoginInput, Person,
} from "../types";

// Buses
export const getBuses = () => api.get<Bus[]>("/buses/").then(r => r.data);
export const getBus = (id: number) => api.get<Bus>(`/buses/${id}/`).then(r => r.data);
export const searchBus = (q: string) => api.get<Bus>(`/buses/search/?q=${q}`).then(r => r.data);
export const createBus = (data: BusInput) => api.post<Bus>("/buses/", data).then(r => r.data);
export const updateBus = (id: number, data: Partial<Bus>) => api.put<Bus>(`/buses/${id}/`, data).then(r => r.data);
export const deleteBus = (id: number) => api.delete(`/buses/${id}/`);

// Parking
export const getGround = () => api.get<ParkingGround[]>("/parking/ground/").then(r => r.data);
export const updateGround = (id: number, data: Partial<ParkingGround>) =>
  api.patch<ParkingGround>(`/parking/ground/${id}/`, data).then(r => r.data);
export const getSlots = (params?: Record<string, string>) =>
  api.get<ParkingSlot[]>("/parking/slots/", { params }).then(r => r.data);
export const getParkingSummary = () => api.get<ParkingSummary>("/parking/summary/").then(r => r.data);

// Sensors
export const getSensors = () => api.get<Sensor[]>("/sensors/").then(r => r.data);
export const postRFIDEvent = (data: { rfid_uid: string; event_type?: string }) =>
  api.post("/sensors/rfid/", data).then(r => r.data);
export const postOccupancyEvent = (data: { sensor_id: string; is_occupied: boolean; slot_id?: number }) =>
  api.post("/sensors/occupancy/", data).then(r => r.data);

// Events
export const getEvents = (params?: Record<string, string>) =>
  api.get<ParkingEvent[]>("/events/", { params }).then(r => r.data);

// Optimization
export const runOptimization = () => api.post<OptimizationResult>("/optimization/run/").then(r => r.data);
export const applyOptimization = (result_id: number) =>
  api.post("/optimization/apply/", { result_id }).then(r => r.data);

// Auth
export const login = (username: string, password: string, cab_number?: string) =>
  api.post<{ access: string; refresh: string }>("/auth/login/", { username, password, cab_number }).then(r => r.data);
export const getMe = () => api.get<CurrentUser>("/auth/me/").then(r => r.data);
export const setIdentity = (identity: "STUDENT" | "TEACHER") =>
  api.patch<CurrentUser>("/auth/me/identity/", { identity }).then(r => r.data);

// Sensors: create / delete
export const createSensor = (data: SensorInput) => api.post<Sensor>("/sensors/", data).then(r => r.data);
export const deleteSensor = (id: number) => api.delete(`/sensors/${id}/`);

// Announcements (anyone can read; admins and transport staff can post)
export const getAnnouncements = () => api.get<Announcement[]>("/announcements/").then(r => r.data);
export const createAnnouncement = (data: AnnouncementInput) =>
  api.post<Announcement>("/announcements/", data).then(r => r.data);
export const deleteAnnouncement = (id: number) => api.delete(`/announcements/${id}/`);

// Students (transport staff / admins only — roll numbers, phone numbers etc. are personal data)
export const getStudents = (params?: Record<string, string>) =>
  api.get<Student[]>("/students/", { params }).then(r => r.data);
export const getStudentsByBus = (busId: number) =>
  api.get<Student[]>("/students/", { params: { bus: String(busId) } }).then(r => r.data);
export const searchStudents = (q: string) =>
  api.get<Student[]>("/students/", { params: { search: q } }).then(r => r.data);
export const getBusRoster = () => api.get<BusRoster[]>("/students/roster/").then(r => r.data);
export const getStudentSummary = () => api.get<StudentSummary>("/students/summary/").then(r => r.data);
export const createStudent = (data: StudentInput) => api.post<Student>("/students/", data).then(r => r.data);
export const updateStudent = (id: number, data: Partial<StudentInput>) =>
  api.patch<Student>(`/students/${id}/`, data).then(r => r.data);
export const deleteStudent = (id: number) => api.delete(`/students/${id}/`);

// Student self-service: link my own login to my roster row by roll number
export const getMyStudentLink = () => api.get<MyStudentLink>("/students/me/").then(r => r.data);
export const linkMyStudentProfile = (roll_number: string) =>
  api.post<MyStudentLink>("/students/me/", { roll_number }).then(r => r.data);
export const unlinkMyStudentProfile = () => api.delete<MyStudentLink>("/students/me/").then(r => r.data);

// Camera tracking (YOLO). Staff can tell the system which bus an unidentified track really is.
export const getVisionTracks = () => api.get<VisionTrack[]>("/vision/tracks/").then(r => r.data);
export const assignVisionTrack = (trackId: number, busId: number) =>
  api.post<VisionTrack>(`/vision/tracks/${trackId}/assign/`, { bus_id: busId }).then(r => r.data);

// Complaints & feedback (any signed-in user can send; reading and managing is admin-only)
export const sendFeedback = (data: FeedbackInput) => api.post("/feedback/", data).then(r => r.data);
export const getFeedback = (params?: Record<string, string>) =>
  api.get<Feedback[]>("/feedback/", { params }).then(r => r.data);
export const updateFeedback = (id: number, data: { status?: FeedbackStatus; admin_note?: string }) =>
  api.patch<Feedback>(`/feedback/${id}/`, data).then(r => r.data);
export const deleteFeedback = (id: number) => api.delete(`/feedback/${id}/`);

// Driver attendance
export const getMyBus = () => api.get<DriverBusResponse>("/attendance/my-bus/").then(r => r.data);
export const setMyBus = (data: { bus_number: string; student_capacity?: number; teacher_capacity?: number }) =>
  api.post<DriverBusResponse>("/attendance/my-bus/", data).then(r => r.data);
export const updateMyBusCapacity = (data: { student_capacity?: number; teacher_capacity?: number }) =>
  api.patch<DriverBusResponse>("/attendance/my-bus/", data).then(r => r.data);
export const getRoster = (date?: string, slot?: AttendanceSlot) =>
  api.get<AttendanceRoster>("/attendance/roster/", {
    params: { ...(date ? { date } : {}), ...(slot ? { slot } : {}) },
  }).then(r => r.data);
export const submitAttendance = (data: AttendanceSubmitInput) =>
  api.post<AttendanceSession>("/attendance/submit/", data).then(r => r.data);
export const getAttendanceHistory = (params?: { from?: string; to?: string }) =>
  api.get<AttendanceSession[]>("/attendance/sessions/", { params }).then(r => r.data);
// JWT auth is a header, not a cookie, so export can't be a plain <a href> link —
// fetch it as a blob (the interceptor attaches the token) and save it client-side.
export const exportAttendance = async (filetype: "csv" | "xlsx" | "pdf", params?: { from?: string; to?: string }) => {
  const res = await api.get("/attendance/export/", {
    params: { filetype, ...params },
    responseType: "blob",
  });
  const disposition = res.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `attendance.${filetype}`;
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Attendance window times (admin/staff can customize when MORNING/EVENING open & close)
export const getAttendanceWindowConfig = () =>
  api.get<AttendanceWindowConfig>("/attendance/window-config/").then(r => r.data);
export const updateAttendanceWindowConfig = (data: Partial<AttendanceWindowConfig>) =>
  api.patch<AttendanceWindowConfig>("/attendance/window-config/", data).then(r => r.data);

// Student's own attendance (yesterday + a short recent trend)
export const getMyAttendance = () => api.get<MyAttendance>("/attendance/my/").then(r => r.data);

export interface QrStatus {
  open: boolean;
  slot: string | null;
  session_id?: number;
  already_marked?: boolean;
}
export const getQrStatus = () => api.get<QrStatus>("/attendance/qr/status/").then(r => r.data);

// Admin/staff correction: the only way to flip an Absent record to Present after submission
export const correctAttendanceRecord = (recordId: number, remark?: string) =>
  api.patch<AttendanceRecord>(`/attendance/records/${recordId}/correct/`, { remark }).then(r => r.data);

// Attendance analytics (admin/staff)
export const getAttendanceAnalyticsOverview = (params: {
  period?: AnalyticsPeriod; year?: number; month?: number; bus?: number; department?: string;
}) => api.get<AttendanceAnalyticsOverview>("/attendance/analytics/overview/", { params }).then(r => r.data);

export const getStudentAttendanceAnalytics = (studentId: number, params?: { year?: number; month?: number }) =>
  api.get<AttendanceStudentAnalytics>(`/attendance/analytics/student/${studentId}/`, { params }).then(r => r.data);

// Maintenance (driver's own bus: service + fuel logs)
export const getMaintenanceSummary = (params?: { bus?: number }) =>
  api.get<MaintenanceSummary>("/maintenance/logs/summary/", { params }).then(r => r.data);
export const getMaintenanceLogs = (params?: { log_type?: MaintenanceLogType; bus?: number }) =>
  api.get<MaintenanceLog[]>("/maintenance/logs/", { params }).then(r => r.data);
export const createMaintenanceLog = (data: MaintenanceLogInput) =>
  api.post<MaintenanceLog>("/maintenance/logs/", data).then(r => r.data);
export const updateMaintenanceLog = (id: number, data: MaintenanceLogInput) =>
  api.put<MaintenanceLog>(`/maintenance/logs/${id}/`, data).then(r => r.data);
export const deleteMaintenanceLog = (id: number) => api.delete(`/maintenance/logs/${id}/`);

// Attendance cheat-detection flags (Step 6) — admin/staff review
export const getFlags = (status?: AttendanceFlagStatus | "ALL") =>
  api.get<AttendanceFlag[]>("/attendance/flags/", { params: status ? { status } : undefined }).then(r => r.data);
export const reviewFlag = (id: number, data: AttendanceFlagReviewInput) =>
  api.patch<AttendanceFlag>(`/attendance/flags/${id}/review/`, data).then(r => r.data);

// Teacher roster CRUD (Section 4) — admin/staff only
export const getTeachers = (busId?: number) =>
  api.get<Teacher[]>("/attendance/teachers/", { params: busId ? { bus: String(busId) } : undefined }).then(r => r.data);
export const createTeacher = (data: TeacherInput & Partial<TeacherLoginInput>) =>
  api.post<Teacher>("/attendance/teachers/", data).then(r => r.data);
export const updateTeacher = (id: number, data: Partial<TeacherInput>) =>
  api.patch<Teacher>(`/attendance/teachers/${id}/`, data).then(r => r.data);
export const deleteTeacher = (id: number) => api.delete(`/attendance/teachers/${id}/`);
export const createTeacherLogin = (teacherId: number, data: TeacherLoginInput) =>
  api.post<Teacher>(`/attendance/teachers/${teacherId}/create-login/`, data).then(r => r.data);

// Unified People page (Section 5) — admin/staff only
export const getPeople = (role?: Person["role"]) =>
  api.get<Person[]>("/auth/people/", { params: role ? { role } : undefined }).then(r => r.data);

// Assign / remove cab in-charge (Section 3) — admin/staff only
export const assignIncharge = (busId: number, data: { source_type: "STUDENT" | "TEACHER"; source_id: number }) =>
  api.post(`/buses/${busId}/assign-incharge/`, data).then(r => r.data);
export const removeIncharge = (busId: number) =>
  api.post(`/buses/${busId}/remove-incharge/`).then(r => r.data);
