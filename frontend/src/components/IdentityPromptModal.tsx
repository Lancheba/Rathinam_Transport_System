import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, User as UserIcon, LoaderCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { linkMyStudentProfile, requestTeacherLink } from "../api/endpoints";
import "./AddBusModal.css";

type Identity = "STUDENT" | "TEACHER";

/**
 * One-time prompt shown to any account that hasn't declared an identity yet —
 * new self-registered sign-ups (always created as Student-role) and Cab
 * In-Charge accounts (role assigned by an admin). Asks whether the underlying
 * person is a Student or a Teacher, then immediately collects the roll number
 * (Student) or staff ID (Teacher) needed to actually link the login to the
 * matching roster row. A Student link takes effect right away; a Teacher link
 * files a request that staff approve on the People page.
 */
export const IdentityPromptModal: React.FC = () => {
  const { setUserIdentity } = useAuth();
  const [step, setStep] = useState<Identity | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Identity | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const choose = async (value: Identity) => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await setUserIdentity(value);
      setStep(value);
    } catch {
      setError("Couldn't save your answer. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const submitLink = async () => {
    if (!step || saving) return;
    const value = linkValue.trim();
    if (!value) {
      setError(step === "STUDENT" ? "Enter your roll number." : "Enter your staff ID.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (step === "STUDENT") {
        await linkMyStudentProfile(value);
      } else {
        await requestTeacherLink(value);
      }
      setDone(step);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "That didn't work — check the value and try again.");
    } finally {
      setSaving(false);
    }
  };

  // Identity is already saved at this point (via setUserIdentity), so the
  // modal won't reappear next login even if the person closes it here.
  const close = () => setDone(step ?? "STUDENT");

  if (done) {
    return createPortal(
      <div className="abm__backdrop">
        <div className="abm__panel liquid-glass-card no-lift" role="dialog" aria-modal="true">
          <div className="abm__head">
            <div className="abm__badge">
              {done === "STUDENT" ? <GraduationCap size={18} /> : <UserIcon size={18} />}
            </div>
            <div>
              <h2 className="abm__title">All set</h2>
              <p className="abm__subtitle">
                {done === "STUDENT"
                  ? "Your account is linked to your roster row."
                  : "Your request is filed — staff will approve the link shortly."}
              </p>
            </div>
          </div>
          <div className="abm__foot">
            <button type="button" className="abm__btn abm__btn--primary" onClick={() => window.location.reload()}>
              Continue
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (step) {
    const isStudent = step === "STUDENT";
    return createPortal(
      <div className="abm__backdrop">
        <div ref={panelRef} className="abm__panel liquid-glass-card no-lift" role="dialog" aria-modal="true" aria-labelledby="idp-title">
          <div className="abm__head">
            <div className="abm__badge">{isStudent ? <GraduationCap size={18} /> : <UserIcon size={18} />}</div>
            <div>
              <h2 id="idp-title" className="abm__title">{isStudent ? "Your roll number" : "Your staff ID"}</h2>
              <p className="abm__subtitle">
                {isStudent
                  ? "So we can link your login to your student record."
                  : "So staff can review and link your login to your teacher record."}
              </p>
            </div>
          </div>

          {error && <div className="abm__alert" role="alert"><span>{error}</span></div>}

          <div className="abm__grid">
            <div className="abm__full">
              <label className="abm__label" htmlFor="idp-link-value">
                {isStudent ? "Roll number" : "Staff ID"}
              </label>
              <input
                id="idp-link-value"
                type="text"
                className="abm__input"
                placeholder={isStudent ? "e.g. 21CS045" : "e.g. T100"}
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                disabled={saving}
                autoFocus
              />
            </div>
          </div>

          <div className="abm__foot">
            <button type="button" className="abm__btn abm__btn--ghost" onClick={close} disabled={saving}>
              I'll do this later
            </button>
            <button type="button" className="abm__btn abm__btn--primary" onClick={submitLink} disabled={saving}>
              {saving && <LoaderCircle size={15} className="abm__spin" />}
              Submit
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="abm__backdrop">
      <div
        ref={panelRef}
        className="abm__panel liquid-glass-card no-lift"
        role="dialog"
        aria-modal="true"
        aria-labelledby="idp-title"
      >
        <div className="abm__head">
          <div className="abm__badge"><UserIcon size={18} /></div>
          <div>
            <h2 id="idp-title" className="abm__title">One quick thing</h2>
            <p className="abm__subtitle">Are you a student or a teacher?</p>
          </div>
        </div>

        {error && (
          <div className="abm__alert" role="alert">
            <span>{error}</span>
          </div>
        )}

        <div className="abm__foot">
          <button
            type="button"
            className="abm__btn abm__btn--ghost"
            onClick={() => choose("STUDENT")}
            disabled={saving}
          >
            {saving && <LoaderCircle size={15} className="abm__spin" />}
            <GraduationCap size={16} style={{ marginRight: 6 }} />
            Student
          </button>
          <button
            type="button"
            className="abm__btn abm__btn--primary"
            onClick={() => choose("TEACHER")}
            disabled={saving}
          >
            {saving && <LoaderCircle size={15} className="abm__spin" />}
            <UserIcon size={16} style={{ marginRight: 6 }} />
            Teacher
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IdentityPromptModal;
