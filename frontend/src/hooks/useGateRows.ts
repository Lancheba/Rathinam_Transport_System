import { useEffect, useMemo, useState } from "react";
import { getSensors } from "../api/endpoints";
import type { Sensor } from "../types";

// RFID gate sensors are registered with a location such as "Row A Entrance".
const ROW_IN_LOCATION = /\brow\s+([A-Za-z0-9]+)/i;

/**
 * Works out which rows have a lane gate from the registered RFID sensors.
 * If no RFID sensor names a row, every row is treated as a gated lane, so the
 * map never claims a row has no gate just because nothing has been registered yet.
 */
export function useGateRows(rows: string[]): Set<string> {
  const [sensors, setSensors] = useState<Sensor[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getSensors()
        .then((list) => { if (!cancelled) setSensors(list); })
        .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const rowsKey = rows.join("|");

  return useMemo(() => {
    const named = new Set<string>();
    sensors
      .filter((s) => s.sensor_type === "RFID")
      .forEach((s) => {
        const match = ROW_IN_LOCATION.exec(s.location);
        if (match) named.add(match[1].toUpperCase());
      });
    const gated = rowsKey ? rowsKey.split("|").filter((r) => named.has(r.toUpperCase())) : [];
    return new Set(gated.length > 0 ? gated : rowsKey ? rowsKey.split("|") : []);
  }, [sensors, rowsKey]);
}
