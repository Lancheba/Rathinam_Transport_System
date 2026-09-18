import api from "./client";
import type {
  Bus, ParkingSlot, ParkingGround, Sensor,
  ParkingEvent, ParkingSummary, OptimizationResult
} from "../types";

// Buses
export const getBuses = () => api.get<Bus[]>("/buses/").then(r => r.data);
export const getBus = (id: number) => api.get<Bus>(`/buses/${id}/`).then(r => r.data);
export const searchBus = (q: string) => api.get<Bus>(`/buses/search/?q=${q}`).then(r => r.data);
export const createBus = (data: Partial<Bus>) => api.post<Bus>("/buses/", data).then(r => r.data);
export const updateBus = (id: number, data: Partial<Bus>) => api.put<Bus>(`/buses/${id}/`, data).then(r => r.data);
export const deleteBus = (id: number) => api.delete(`/buses/${id}/`);

// Parking
export const getGround = () => api.get<ParkingGround[]>("/parking/ground/").then(r => r.data);
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
