import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ParkingMap2D from "./ParkingMap2D";
import type { ParkingSlot } from "../types";

vi.mock("../api/endpoints", () => ({
  getSensors: vi.fn().mockResolvedValue([]),
}));

const makeSlot = (overrides: Partial<ParkingSlot> = {}): ParkingSlot => ({
  id: 1, ground: 1, row: "A", slot_number: 1,
  x_position_m: "0", y_position_m: "0",
  is_occupied: false, is_blocked: false,
  bus: null, bus_number: null, bus_departure: null, bus_route: null,
  ...overrides,
});

describe("ParkingMap2D", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a friendly message when no slots are configured", () => {
    render(<ParkingMap2D slots={[]} />);
    expect(screen.getByText(/no parking slots are configured/i)).toBeInTheDocument();
  });

  it("renders correct legend counts for a mix of free, occupied and blocked slots", () => {
    const slots = [
      makeSlot({ id: 1, slot_number: 1, is_occupied: false }),
      makeSlot({ id: 2, slot_number: 2, is_occupied: true, bus_number: "TN01" }),
      makeSlot({ id: 3, slot_number: 3, is_occupied: true, is_blocked: true, bus_number: "TN02" }),
    ];
    render(<ParkingMap2D slots={slots} />);

    // Total / Free / Parked / Blocked pills
    expect(screen.getByText("3")).toBeInTheDocument(); // Total
    const pills = screen.getAllByText(/^[0-9]+$/);
    expect(pills.map((p) => p.textContent).sort()).toEqual(["1", "1", "1", "3"]);
  });

  it("shows the occupying bus number on an occupied slot", () => {
    const slots = [makeSlot({ id: 1, row: "A", slot_number: 1, is_occupied: true, bus_number: "TN07AB1234", bus_route: "Route 7", bus_departure: "5:30 PM" })];
    render(<ParkingMap2D slots={slots} />);
    expect(screen.getByText("TN07AB1234")).toBeInTheDocument();
  });

  it("marks a blocked slot with a warning icon and blocked tooltip", () => {
    const slots = [makeSlot({ id: 1, row: "A", slot_number: 1, is_occupied: true, is_blocked: true, bus_number: "TN01", bus_route: "R1", bus_departure: "5 PM" })];
    render(<ParkingMap2D slots={slots} />);
    expect(screen.getByTitle(/BLOCKED/)).toBeInTheDocument();
  });

  it("labels an empty slot as free in its tooltip when it's bus-parkable", () => {
    const slots = [makeSlot({ id: 1, row: "A", slot_number: 1, is_occupied: false })];
    render(<ParkingMap2D slots={slots} />);
    expect(screen.getByTitle("A1 — Free")).toBeInTheDocument();
  });
});
