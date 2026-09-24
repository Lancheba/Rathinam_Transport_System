import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bus as BusIcon, X, User, Phone, Route as RouteIcon, Clock, Radio, Users, ShieldCheck } from "lucide-react";
import type { Bus } from "../types";
import "./AddBusModal.css";

interface Props {
  bus: Bus;
  onClose: () => void;
}

const Row: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(148,163,184,0.1)" }}>
    <span style={{ color: "var(--accent-blue)", marginTop: 2, flexShrink: 0 }}>{icon}</span>
    <span style={{ color: "var(--text-muted)", fontSize: 12, width: 110, flexShrink: 0 }}>{label}</span>
    <span style={{ color: "var(--text-strong)", fontSize: 13, fontWeight: 600, flex: 1 }}>{value}</span>
  </div>
);

export const BusDetailModal: React.FC<Props> = ({ bus, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const downOnBackdrop = useRef(false);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  };

  // The server leaves the RFID UID and the driver / in-charge details out of the
  // response for everyone except admins and transport staff.
  const showStaffDetails = bus.rfid_uid !== undefined;
  const hasDriver = Boolean(bus.driver_username);
  const hasIncharge = Boolean(bus.incharge_username);

  return createPortal(
    <div
      className="abm__backdrop"
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (downOnBackdrop.current && e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        className="abm__panel liquid-glass-card no-lift"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bdm-title"
        tabIndex={-1}
      >
        <div className="abm__head">
          <div className="abm__badge"><BusIcon size={18} /></div>
          <div>
            <h2 id="bdm-title" className="abm__title">{bus.bus_number}</h2>
            <p className="abm__subtitle">Cab details</p>
          </div>
          <button type="button" className="abm__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Row icon={<RouteIcon size={14} />} label="Route" value={bus.route} />
          <Row icon={<Clock size={14} />} label="Departs" value={bus.departure_time} />
          {showStaffDetails && (
            <Row icon={<Radio size={14} />} label="RFID" value={<code style={{ fontSize: 11 }}>{bus.rfid_uid}</code>} />
          )}
          <Row
            icon={<Users size={14} />}
            label="Capacity"
            value={`${bus.student_capacity ?? 0} students, ${bus.teacher_capacity ?? 0} teachers`}
          />
        </div>

        {showStaffDetails ? (
          <>
          <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Driver
          </div>
          {hasDriver ? (
            <>
              <Row icon={<User size={14} />} label="Name" value={bus.driver_username} />
              <Row icon={<Phone size={14} />} label="Phone" value={bus.driver_phone || "Not on file"} />
            </>
          ) : (
            <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "8px 0" }}>No driver assigned yet.</div>
          )}

          <div style={{ margin: "14px 0 4px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Cab In-Charge
          </div>
          {hasIncharge ? (
            <>
              <Row icon={<ShieldCheck size={14} />} label="Name" value={bus.incharge_username} />
              <Row icon={<Phone size={14} />} label="Phone" value={bus.incharge_phone || "Not on file"} />
            </>
          ) : (
            <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "8px 0 0" }}>No in-charge assigned yet.</div>
          )}
          </>
        ) : (
          <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "8px 0 0" }}>
            Driver and in-charge contact details are visible to transport staff only.
          </div>
        )}

        <div className="abm__foot">
          <button type="button" className="abm__btn abm__btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
