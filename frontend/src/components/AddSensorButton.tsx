import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AddSensorModal } from "./AddSensorModal";
import type { Sensor } from "../types";

interface Props {
  variant?: "primary" | "subtle";
  onCreated: (sensor: Sensor) => void;
}

/** "Add sensor" button + dialog. Renders nothing unless the user is an admin or transport staff. */
export const AddSensorButton: React.FC<Props> = ({ variant = "primary", onCreated }) => {
  const { canManageBuses } = useAuth();
  const [open, setOpen] = useState(false);

  if (!canManageBuses) return null;

  return (
    <>
      <button type="button" className={`abm-trigger abm-trigger--${variant}`} onClick={() => setOpen(true)}>
        <Plus size={variant === "subtle" ? 13 : 15} strokeWidth={2.4} />
        Add sensor
      </button>
      {open && (
        <AddSensorModal
          onClose={() => setOpen(false)}
          onCreated={(sensor) => {
            setOpen(false);
            onCreated(sensor);
          }}
        />
      )}
    </>
  );
};
