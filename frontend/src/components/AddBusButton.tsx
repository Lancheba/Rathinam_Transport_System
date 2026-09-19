import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AddBusModal } from "./AddBusModal";
import type { Bus } from "../types";

interface Props {
  /** "primary" for page headers, "subtle" for compact card headers */
  variant?: "primary" | "subtle";
  onCreated: (bus: Bus) => void;
}

/** "Add bus" button + dialog. Renders nothing unless the user is an admin or transport staff. */
export const AddBusButton: React.FC<Props> = ({ variant = "primary", onCreated }) => {
  const { canManageBuses } = useAuth();
  const [open, setOpen] = useState(false);

  if (!canManageBuses) return null;

  return (
    <>
      <button type="button" className={`abm-trigger abm-trigger--${variant}`} onClick={() => setOpen(true)}>
        <Plus size={variant === "subtle" ? 13 : 15} strokeWidth={2.4} />
        Add bus
      </button>
      {open && (
        <AddBusModal
          onClose={() => setOpen(false)}
          onCreated={(bus) => {
            setOpen(false);
            onCreated(bus);
          }}
        />
      )}
    </>
  );
};
