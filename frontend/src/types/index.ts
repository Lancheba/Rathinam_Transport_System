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
  role: "ADMIN" | "STAFF" | "STUDENT";
  can_manage_buses: boolean;
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
  sensor_type: "RFID" | "ULTRASONIC";
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
  sensor_type: "RFID" | "ULTRASONIC";
  location: string;
  is_active: boolean;
}
