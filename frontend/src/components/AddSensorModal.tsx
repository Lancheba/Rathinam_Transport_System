import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Radio, X, TriangleAlert, LoaderCircle } from "lucide-react";
import { createSensor } from "../api/endpoints";
import type { Sensor, SensorInput } from "../types";
import "./AddBusModal.css";

interface Props {
  onClose: () => void;
  onCreated: (sensor: Sensor) => void;
}

type FormState = {
  sensor_id: string;
  sensor_type: "RFID" | "ULTRASONIC" | "CAMERA";
  location: string;
  is_active: boolean;
};
type FieldName = Exclude<keyof FormState, "is_active" | "sensor_type">;
type Errors = Partial<Record<FieldName, string>>;

const FIELDS: FieldName[] = ["sensor_id", "location"];

const INITIAL: FormState = {
  sensor_id: "",
  sensor_type: "RFID",
  location: "",
  is_active: true,
};

const validate = (f: FormState): Errors => {
  const e: Errors = {};
  if (!f.sensor_id.trim()) e.sensor_id = "Enter a sensor ID.";
  if (!f.location.trim()) e.location = "Enter the sensor location.";
  return e;
};

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export const AddSensorModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ name: FieldName } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const downOnBackdrop = useRef(false);

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
    if (focusRequest) panelRef.current?.querySelector<HTMLElement>(`#asm-${focusRequest.name}`)?.focus();
  }, [focusRequest]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !saving) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
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
    if (key !== "is_active" && key !== "sensor_type" && errors[key as FieldName]) {
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

    const payload: SensorInput = {
      sensor_id: form.sensor_id.trim(),
      sensor_type: form.sensor_type,
      location: form.location.trim(),
      is_active: form.is_active,
    };

    setSaving(true);
    setFormError("");
    try {
      const sensor = await createSensor(payload);
      onCreated(sensor);
    } catch (err) {
      setSaving(false);
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response;
        if (status === 400 && data && typeof data === "object") {
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
            setFormError("Couldn't add the sensor. Check the details and try again.");
          }
          return;
        }
        if (status === 401) {
          setFormError("Your session has expired. Sign in again to add a sensor.");
          return;
        }
        if (status === 403) {
          setFormError("Only admins and transport staff can add sensors.");
          return;
        }
      }
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const field = (name: FieldName) => ({
    id: `asm-${name}`,
    className: "abm__input",
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `asm-${name}-err` : undefined,
    disabled: saving,
  });

  const err = (name: FieldName) =>
    errors[name] ? (
      <div id={`asm-${name}-err`} className="abm__error" role="alert">
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
        aria-labelledby="asm-title"
      >
        <div className="abm__head">
          <div className="abm__badge"><Radio size={18} /></div>
          <div>
            <h2 id="asm-title" className="abm__title">Add sensor</h2>
            <p className="abm__subtitle">Register an RFID reader, ultrasonic sensor or camera.</p>
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
            <div className="abm__full">
              <label className="abm__label" htmlFor="asm-sensor_id">Sensor ID</label>
              <input
                {...field("sensor_id")}
                ref={firstFieldRef}
                value={form.sensor_id}
                onChange={(e) => set("sensor_id", e.target.value)}
                placeholder="Sensor ID"
                maxLength={50}
                autoComplete="off"
                spellCheck={false}
              />
              {err("sensor_id")}
            </div>

            <div className="abm__full">
              <label className="abm__label" htmlFor="asm-sensor_type">Sensor type</label>
              <select
                id="asm-sensor_type"
                className="abm__input"
                value={form.sensor_type}
                onChange={(e) => set("sensor_type", e.target.value as FormState["sensor_type"])}
                disabled={saving}
              >
                <option value="RFID">RFID</option>
                <option value="ULTRASONIC">Ultrasonic</option>
                <option value="CAMERA">Camera</option>
              </select>
            </div>

            <div className="abm__full">
              <label className="abm__label" htmlFor="asm-location">Location</label>
              <input
                {...field("location")}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Location"
                maxLength={100}
                autoComplete="off"
              />
              {err("location")}
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
              {saving ? "Adding sensor" : "Add sensor"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
