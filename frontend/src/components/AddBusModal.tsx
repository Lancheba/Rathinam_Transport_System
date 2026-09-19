import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Bus as BusIcon, X, TriangleAlert, LoaderCircle } from "lucide-react";
import { createBus } from "../api/endpoints";
import type { Bus, BusInput } from "../types";
import "./AddBusModal.css";

interface Props {
  onClose: () => void;
  onCreated: (bus: Bus) => void;
}

type FormState = {
  bus_number: string;
  rfid_uid: string;
  route: string;
  departure_time: string;
  length_m: string;
  width_m: string;
  is_active: boolean;
};
type FieldName = Exclude<keyof FormState, "is_active">;
type Errors = Partial<Record<FieldName, string>>;

const FIELDS: FieldName[] = ["bus_number", "rfid_uid", "route", "departure_time", "length_m", "width_m"];

// Typical college bus; matches the demo data
const INITIAL: FormState = {
  bus_number: "",
  rfid_uid: "",
  route: "",
  departure_time: "",
  length_m: "12",
  width_m: "2.5",
  is_active: true,
};

// Decimal(5, 2) on the server: up to 999.99 with at most two decimals
const validateSize = (raw: string, label: string): string | undefined => {
  const v = raw.trim();
  if (!v) return `Enter the bus ${label}.`;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return `The ${label} must be greater than 0.`;
  if (n >= 1000) return `The ${label} must be under 1000 m.`;
  if (/\.\d{3,}$/.test(v)) return "Use at most two decimal places.";
  return undefined;
};

const validate = (f: FormState): Errors => {
  const e: Errors = {};
  if (!f.bus_number.trim()) e.bus_number = "Enter a bus number.";
  if (!f.rfid_uid.trim()) e.rfid_uid = "Enter the RFID UID.";
  if (!f.route.trim()) e.route = "Enter the route.";
  if (!f.departure_time) e.departure_time = "Choose a departure time.";
  const len = validateSize(f.length_m, "length");
  if (len) e.length_m = len;
  const wid = validateSize(f.width_m, "width");
  if (wid) e.width_m = wid;
  return e;
};

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export const AddBusModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // Fields are disabled while saving, so focus has to move after the re-render
  const [focusRequest, setFocusRequest] = useState<{ name: FieldName } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const downOnBackdrop = useRef(false);

  // Focus the first field, lock page scroll, and hand focus back on close
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // On touch screens, focusing pops the keyboard up over the form before it has been seen
    if (window.matchMedia("(pointer: fine)").matches) firstFieldRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (focusRequest) panelRef.current?.querySelector<HTMLElement>(`#abm-${focusRequest.name}`)?.focus();
  }, [focusRequest]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !saving) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    // keep Tab inside the dialog
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key !== "is_active" && errors[key as FieldName]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError("");
      const firstBad = FIELDS.find((k) => found[k]);
      if (firstBad) setFocusRequest({ name: firstBad });
      return;
    }

    const payload: BusInput = {
      bus_number: form.bus_number.trim(),
      rfid_uid: form.rfid_uid.trim(),
      route: form.route.trim(),
      departure_time: form.departure_time,
      length_m: form.length_m.trim(),
      width_m: form.width_m.trim(),
      is_active: form.is_active,
    };

    setSaving(true);
    setFormError("");
    try {
      const bus = await createBus(payload);
      onCreated(bus);
    } catch (err) {
      setSaving(false);
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response;
        if (status === 400 && data && typeof data === "object") {
          // DRF sends { field: ["message"] }
          const fieldErrors: Errors = {};
          for (const key of FIELDS) {
            const msg = (data as Record<string, unknown>)[key];
            if (msg) fieldErrors[key] = Array.isArray(msg) ? String(msg[0]) : String(msg);
          }
          setErrors(fieldErrors);
          const firstBad = FIELDS.find((k) => fieldErrors[k]);
          if (firstBad) {
            setFocusRequest({ name: firstBad });
          } else {
            setFormError("Couldn't add the bus. Check the details and try again.");
          }
          return;
        }
        if (status === 401) {
          setFormError("Your session has expired. Sign in again to add a bus.");
          return;
        }
        if (status === 403) {
          setFormError("Only admins and transport staff can add buses.");
          return;
        }
      }
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const field = (name: FieldName) => ({
    id: `abm-${name}`,
    className: "abm__input",
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `abm-${name}-err` : undefined,
    disabled: saving,
  });

  const err = (name: FieldName) =>
    errors[name] ? (
      <div id={`abm-${name}-err`} className="abm__error" role="alert">
        {errors[name]}
      </div>
    ) : null;

  return createPortal(
    <div
      className="abm__backdrop"
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget && !saving) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        className="abm__panel liquid-glass-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="abm-title"
      >
        <div className="abm__head">
          <div className="abm__badge"><BusIcon size={18} /></div>
          <div>
            <h2 id="abm-title" className="abm__title">Add bus</h2>
            <p className="abm__subtitle">Register a bus so it can be tracked and parked.</p>
          </div>
          <button type="button" className="abm__close" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {formError && (
          <div className="abm__alert" role="alert">
            <TriangleAlert size={15} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="abm__grid">
            <div>
              <label className="abm__label" htmlFor="abm-bus_number">Bus number</label>
              <input
                {...field("bus_number")}
                ref={firstFieldRef}
                value={form.bus_number}
                onChange={(e) => set("bus_number", e.target.value)}
                placeholder="B09"
                maxLength={20}
                autoComplete="off"
              />
              {err("bus_number")}
            </div>

            <div>
              <label className="abm__label" htmlFor="abm-rfid_uid">RFID UID</label>
              <input
                {...field("rfid_uid")}
                value={form.rfid_uid}
                onChange={(e) => set("rfid_uid", e.target.value)}
                placeholder="e.g. RFID-009"
                maxLength={100}
                autoComplete="off"
                spellCheck={false}
              />
              {err("rfid_uid") ?? <div className="abm__hint">Must match the tag on the bus exactly.</div>}
            </div>

            <div className="abm__full">
              <label className="abm__label" htmlFor="abm-route">Route</label>
              <input
                {...field("route")}
                value={form.route}
                onChange={(e) => set("route", e.target.value)}
                placeholder="Route 9 - Tech Park"
                maxLength={100}
                autoComplete="off"
              />
              {err("route")}
            </div>

            <div className="abm__full">
              <label className="abm__label" htmlFor="abm-departure_time">Departure time</label>
              <input
                {...field("departure_time")}
                type="time"
                value={form.departure_time}
                onChange={(e) => set("departure_time", e.target.value)}
              />
              {err("departure_time") ?? (
                <div className="abm__hint">Optimisation parks earlier departures closest to the exit.</div>
              )}
            </div>

            <div>
              <label className="abm__label" htmlFor="abm-length_m">Length (m)</label>
              <input
                {...field("length_m")}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.length_m}
                onChange={(e) => set("length_m", e.target.value)}
              />
              {err("length_m")}
            </div>

            <div>
              <label className="abm__label" htmlFor="abm-width_m">Width (m)</label>
              <input
                {...field("width_m")}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.width_m}
                onChange={(e) => set("width_m", e.target.value)}
              />
              {err("width_m")}
            </div>

            <div className="abm__full">
              <label className="abm__check">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  disabled={saving}
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div className="abm__foot">
            <button type="button" className="abm__btn abm__btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="abm__btn abm__btn--primary" disabled={saving}>
              {saving && <LoaderCircle size={15} className="abm__spin" />}
              {saving ? "Adding bus" : "Add bus"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
