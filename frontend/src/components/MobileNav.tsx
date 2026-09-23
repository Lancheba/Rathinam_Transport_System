import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Ellipsis, Search } from "lucide-react";
import { navItems, MOBILE_TAB_COUNT } from "./navItems";
import { useAuth } from "../context/AuthContext";
import "./MobileNav.css";

/** Bottom tab bar for phones and small tablets. Replaces the sidebar below 900px. */
export const MobileNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { canManageBuses, role } = useAuth();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Staff-only links (e.g. Students) never take one of the precious mobile tab
  // slots for a signed-out or student user — they're filtered before slicing.
  const visible = navItems.filter(
    (item) =>
      (!item.staffOnly || canManageBuses) &&
      (!item.driverOnly || role === "DRIVER") &&
      (!item.studentOnly || (role === "STUDENT" && !canManageBuses)) &&
      (!item.inchargeOnly || role === "INCHARGE")
  );
  const tabs = visible.slice(0, MOBILE_TAB_COUNT);
  const more = [
    ...visible.slice(MOBILE_TAB_COUNT),
    // Students use this on their phones, so it earns a place here
    { to: "/dashboard/find", label: "Find My Bus", short: "Find", icon: Search },
  ];

  const moreActive = more.some((m) => pathname.startsWith(m.to));

  // While the sheet is open: lock page scroll, close on Escape, move focus into it
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <nav className="mnav" aria-label="Main">
        {tabs.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `mnav__item${isActive && !open ? " is-active" : ""}`}
          >
            <span className="mnav__icon"><Icon size={20} strokeWidth={1.9} /></span>
            <span className="mnav__label">{short}</span>
          </NavLink>
        ))}

        <button
          type="button"
          className={`mnav__item${open || moreActive ? " is-active" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="mnav__icon"><Ellipsis size={20} strokeWidth={1.9} /></span>
          <span className="mnav__label">More</span>
        </button>
      </nav>

      {open && (
        <div className="msheet" onClick={() => setOpen(false)}>
          <div
            ref={sheetRef}
            className="msheet__panel"
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="msheet__grip" aria-hidden="true" />
            <div className="msheet__grid">
              {more.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `msheet__item${isActive ? " is-active" : ""}`}
                >
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;

