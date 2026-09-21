import api from "./client";
import type {
  Bus, BusInput, CurrentUser, ParkingSlot, ParkingGround, Sensor,
  ParkingEvent, ParkingSummary, OptimizationResult, SensorInput,
  Announcement, AnnouncementInput, VisionTrack, Student, StudentInput, BusRoster, StudentSummary
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
export const login = (username: string, password: string) =>
  api.post<{ access: string; refresh: string }>("/auth/login/", { username, password }).then(r => r.data);
export const getMe = () => api.get<CurrentUser>("/auth/me/").then(r => r.data);

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

// Camera tracking (YOLO). Staff can tell the system which bus an unidentified track really is.
export const getVisionTracks = () => api.get<VisionTrack[]>("/vision/tracks/").then(r => r.data);
export const assignVisionTrack = (trackId: number, busId: number) =>
  api.post<VisionTrack>(`/vision/tracks/${trackId}/assign/`, { bus_id: busId }).then(r => r.data);
