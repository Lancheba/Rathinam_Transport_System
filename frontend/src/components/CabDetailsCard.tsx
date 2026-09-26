import React from "react";
import { MapPin, Clock, Ruler, Users, CheckCircle2, XCircle } from "lucide-react";
import type { Bus } from "../types";

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div>
    <div style={{
      display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 11.5,
      fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4,
    }}>
      {icon} {label}
    </div>
    <div style={{ color: "var(--text-strong)", fontSize: 14, fontWeight: 600 }}>{children}</div>
  </div>
);

export const CabDetailsCard: React.FC<{ bus: Bus }> = ({ bus }) => (
  <div className="liquid-glass-card" style={{
    padding: 18, marginBottom: 20, border: "1px solid rgba(96,165,250,0.15)",
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16,
  }}>
    <DetailItem icon={<MapPin size={13} />} label="Route">{bus.route || "-"}</DetailItem>
    <DetailItem icon={<Clock size={13} />} label="Departure">{bus.departure_time || "-"}</DetailItem>
    <DetailItem icon={<Ruler size={13} />} label="Dimensions">{bus.length_m} m x {bus.width_m} m</DetailItem>
    <DetailItem icon={<Users size={13} />} label="Capacity">
      {bus.student_capacity ?? 0} students &middot; {bus.teacher_capacity ?? 0} teachers
    </DetailItem>
    <DetailItem
      icon={bus.is_active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      label="Status"
    >
      <span style={{ color: bus.is_active ? "var(--accent-green)" : "var(--accent-red)" }}>
        {bus.is_active ? "Active" : "Inactive"}
      </span>
    </DetailItem>
  </div>
);
