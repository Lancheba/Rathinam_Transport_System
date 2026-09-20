import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Search, CircleX, Bus as BusIcon, MapPin, ParkingSquare, TriangleAlert, Route as RouteIcon, Clock } from "lucide-react";
import { searchBus } from "../api/endpoints";
import type { Bus } from "../types";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 400;

type Outcome = { q: string; bus: Bus | null; error: string };

/**
 * Find My Bus. There is no search box here: it uses the search bar in the top navbar,
 * which puts the text in the URL as ?q=... and this page looks that bus up.
 */
const BusFinder: React.FC = () => {
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim().toUpperCase();

  // Wait for a pause in typing so "B" and "B0" don't each trigger a "not found"
  const [settled, setSettled] = useState(q);
  useEffect(() => {
    const id = setTimeout(() => setSettled(q), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q]);

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  useEffect(() => {
    if (settled.length < MIN_CHARS) return;
    let cancelled = false;
    searchBus(settled)
      .then((bus) => { if (!cancelled) setOutcome({ q: settled, bus, error: "" }); })
      .catch((err) => {
        if (cancelled) return;
        const signedOut = axios.isAxiosError(err) && err.response?.status === 401;
        setOutcome({
          q: settled,
          bus: null,
          error: signedOut
            ? "Please sign in to search for a bus."
            : "Bus not found. Check the bus number and try again.",
        });
      });
    return () => { cancelled = true; };
  }, [settled]);

  const searching = q.length >= MIN_CHARS;
  const current = searching && outcome?.q === q ? outcome : null;
  const result = current?.bus ?? null;
  const error = current?.error ?? "";
  const loading = searching && !current;

  const slot = result?.parking_slot_info;

  return (
    <div className="bf" style={{ maxWidth: 500, margin: "0 auto", paddingTop: 40 }}>
      <h2 style={{ color: "var(--text-strong)", textAlign: "center", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Search size={20} strokeWidth={1.9} /> Find My Bus
      </h2>
      <p style={{ color: "var(--text-muted)", textAlign: "center", marginBottom: 24, fontSize: 14 }}>
        Type your bus number in the search bar above to find its parking location
      </p>

      {loading && (
        <div style={{ color: "var(--text-muted)", textAlign: "center", fontSize: 14 }}>Searching…</div>
      )}

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgb(var(--ov) / 0.05)", border: "1px dashed rgb(var(--ov) / 0.3)",
          borderRadius: 10, padding: 16, color: "var(--text-soft)"
        }}>
          <CircleX size={16} /> {error}
        </div>
      )}

      {result && (
        <div className="liquid-glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 26, fontWeight: "bold", color: "var(--text-strong)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <BusIcon size={24} strokeWidth={1.9} /> Bus {result.bus_number}
          </div>
          <hr style={{ borderColor: "rgb(var(--ov) / 0.1)", marginBottom: 16 }} />

          {slot ? (
            <>
              <div style={{ fontSize: 17, color: "var(--text-muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={16} /> Row <strong style={{ color: "var(--text-strong)" }}>{slot.row}</strong>
              </div>
              <div style={{ fontSize: 17, color: "var(--text-soft)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <ParkingSquare size={16} /> Slot <strong style={{ color: "var(--text-strong)" }}>{slot.slot_number}</strong>
              </div>
              {slot.is_blocked && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgb(var(--ov) / 0.08)", border: "1px dashed rgb(var(--ov) / 0.3)",
                  borderRadius: 8, padding: "8px 12px", color: "var(--text-strong)", marginBottom: 12, fontWeight: 600
                }}>
                  <TriangleAlert size={14} /> This bus may be blocked by another bus. Check with transport staff.
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "var(--text-soft)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={16} /> Not currently parked
            </div>
          )}

          <div style={{ color: "var(--text-muted)", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RouteIcon size={14} /> Route: <strong style={{ color: "var(--text-soft)" }}>{result.route}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={14} /> Departure: <strong style={{ color: "var(--text-soft)" }}>{result.departure_time}</strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BusFinder;
