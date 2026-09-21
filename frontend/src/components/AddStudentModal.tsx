import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { GraduationCap, X, TriangleAlert, LoaderCircle } from "lucide-react";
import { createStudent } from "../api/endpoints";
import type { Bus, Student, StudentInput } from "../types";
import "./AddStudentModal.css";

interface Props {
  buses: Bus[];
  /** Pre-select a bus, e.g. when opened from that bus's roster view. */
  defaultBusId?: number | null;
  onClose: () => void;
  onCreated: (student: Student) => void;
}

type FormState = {
  name: string;
  roll_number: string;
  department: string;
  year: string;
  phone: string;
  email: string;
  boarding_point: string;
  bus: string;
};
type FieldName = keyof FormState;
type Errors = Partial<Record<FieldName, string>>;

const REQUIRED: FieldName[] = ["name", "roll_number"];

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';

export const AddStudentModal: React.FC<Props> = ({ buses, defaultBusId, onClose, onCreated }) => {
  const [form, setForm] = useState<FormState>({
    name: "", roll_number: "", department: "", year: "", phone: "", email: "", boarding_point: "",
    bus: defaultBusId ? String(defaultBusId) : "",
  });
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

  const set = <K extends FieldName>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (f: FormState): Errors => {
    const e: Errors = {};
    if (!f.name.trim()) e.name = "Enter the student's name.";
    if (!f.roll_number.trim()) e.roll_number = "Enter the roll number.";
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError("");
      const firstBad = REQUIRED.find((k) => found[k]) ?? (Object.keys(found)[0] as FieldName);
      if (firstBad) setFocusRequest({ name: firstBad });
      return;
    }

    const payload: StudentInput = {
      name: form.name.trim(),
      roll_number: form.roll_number.trim(),
      department: form.department.trim(),
      year: form.year ? (Number(form.year) as 1 | 2 | 3 | 4) : null,
      phone: form.phone.trim(),
      email: form.email.trim(),
      boarding_point: form.boarding_point.trim(),
      bus: form.bus ? Number(form.bus) : null,
    };

    setSaving(true);
    setFormError("");
    try {
      const student = await createStudent(payload);
      onCreated(student);
    } catch (err) {
      setSaving(false);
      if (axios.isAxiosError(err) && err.response) {
        const { status, data } = err.response;
        if (status === 400 && data && typeof data === "object") {
          const fieldErrors: Errors = {};
          for (const key of Object.keys(form) as FieldName[]) {
            const msg = (data as Record<string, unknown>)[key];
            if (msg) fieldErrors[key] = Array.isArray(msg) ? String(msg[0]) : String(msg);
          }
          setErrors(fieldErrors);
          const firstBad = (Object.keys(fieldErrors) as FieldName[])[0];
          if (firstBad) {
            setFocusRequest({ name: firstBad });
          } else {
            setFormError("Couldn't add the student. Check the details and try again.");
          }
          return;
        }
        if (status === 401) {
          setFormError("Your session has expired. Sign in again to add a student.");
          return;
        }
        if (status === 403) {
          setFormError("Only admins and transport staff can add students.");
          return;
        }
      }
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  const field = (name: FieldName) => ({
    id: `asm-${name}`,
    className: "asm__input",
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `asm-${name}-err` : undefined,
    disabled: saving,
  });

  const err = (name: FieldName) =>
    errors[name] ? (
      <div id={`asm-${name}-err`} className="asm__error" role="alert">
        {errors[name]}
      </div>
    ) : null;

  return createPortal(
    <div
      className="asm__backdrop"
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget && !saving) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div ref={panelRef} className="asm__panel liquid-glass-card" role="dialog" aria-modal="true" aria-labelledby="asm-title">
        <div className="asm__head">
          <div className="asm__badge"><GraduationCap size={18} /></div>
          <div>
            <h2 id="asm-title" className="asm__title">Add student</h2>
            <p className="asm__subtitle">Add a student and assign them to a bus.</p>
          </div>
          <button type="button" className="asm__close" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {formError && (
          <div className="asm__alert" role="alert">
            <TriangleAlert size={15} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="asm__grid">
            <div className="asm__full">
              <label className="asm__label" htmlFor="asm-name">Full name</label>
              <input
                {...field("name")}
                ref={firstFieldRef}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Student's full name"
                maxLength={150}
                autoComplete="off"
              />
              {err("name")}
            </div>

            <div>
              <label className="asm__label" htmlFor="asm-roll_number">Roll number</label>
              <input
                {...field("roll_number")}
                value={form.roll_number}
                onChange={(e) => set("roll_number", e.target.value)}
                placeholder="e.g. 21CS045"
                maxLength={30}
                autoComplete="off"
              />
              {err("roll_number")}
            </div>

            <div>
              <label className="asm__label" htmlFor="asm-department">Department</label>
              <input
                {...field("department")}
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                placeholder="e.g. CSE"
                maxLength={100}
                autoComplete="off"
              />
              {err("department")}
            </div>

            <div>
              <label className="asm__label" htmlFor="asm-year">Year</label>
              <select {...field("year")} value={form.year} onChange={(e) => set("year", e.target.value)}>
                <option value="">Not set</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
              {err("year")}
            </div>

            <div>
              <label className="asm__label" htmlFor="asm-bus">Bus</label>
              <select {...field("bus")} value={form.bus} onChange={(e) => set("bus", e.target.value)}>
                <option value="">Unassigned</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>{b.bus_number} — {b.route}</option>
                ))}
              </select>
              {err("bus")}
            </div>

            <div>
              <label className="asm__label" htmlFor="asm-phone">Phone</label>
              <input
                {...field("phone")}
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="Contact number"
                maxLength={20}
                autoComplete="off"
              />
              {err("phone")}
            </div>

            <div>
              <label className="asm__label" htmlFor="asm-email">Email</label>
              <input
                {...field("email")}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
              {err("email")}
            </div>

            <div className="asm__full">
              <label className="asm__label" htmlFor="asm-boarding_point">Boarding point</label>
              <input
                {...field("boarding_point")}
                value={form.boarding_point}
                onChange={(e) => set("boarding_point", e.target.value)}
                placeholder="Stop where they board, e.g. Anna Nagar"
                maxLength={150}
                autoComplete="off"
              />
              {err("boarding_point")}
            </div>
          </div>

          <div className="asm__foot">
            <button type="button" className="asm__btn asm__btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="asm__btn asm__btn--primary" disabled={saving}>
              {saving && <LoaderCircle size={15} className="asm__spin" />}
              {saving ? "Adding student" : "Add student"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
