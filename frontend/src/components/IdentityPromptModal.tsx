import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, User as UserIcon, LoaderCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./AddBusModal.css";

/**
 * One-time prompt shown to Cab In-Charge accounts (role assigned by an admin)
 * asking whether the underlying person is a Student or a Teacher. This is
 * record-keeping only — it never changes the account's role.
 */
export const IdentityPromptModal: React.FC = () => {
  const { setUserIdentity } = useAuth();
  const [saving, setSaving] = useState<"STUDENT" | "TEACHER" | null>(null);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const choose = async (value: "STUDENT" | "TEACHER") => {
    if (saving) return;
    setSaving(value);
    setError("");
    try {
      await setUserIdentity(value);
    } catch {
      setSaving(null);
      setError("Couldn't save your answer. Check your connection and try again.");
    }
  };

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
            <p className="abm__subtitle">Are you a student or a teacher? This is just for our records.</p>
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
            disabled={saving !== null}
          >
            {saving === "STUDENT" && <LoaderCircle size={15} className="abm__spin" />}
            <GraduationCap size={16} style={{ marginRight: 6 }} />
            Student
          </button>
          <button
            type="button"
            className="abm__btn abm__btn--primary"
            onClick={() => choose("TEACHER")}
            disabled={saving !== null}
          >
            {saving === "TEACHER" && <LoaderCircle size={15} className="abm__spin" />}
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
