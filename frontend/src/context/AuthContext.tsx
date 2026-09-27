import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { login as loginAPI, getMe, setIdentity as setIdentityAPI } from "../api/endpoints";
import type { CurrentUser } from "../types";

interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  role: CurrentUser["role"] | null;
  roleLabel: string | null;
  canManageBuses: boolean;
  isAdmin: boolean;
  /** Bus number this driver is linked to, if role is DRIVER and a bus has been claimed */
  drivenBusNumber: string | null;
  identity: CurrentUser["identity"];
  /** Bus number this in-charge is linked to, if role is INCHARGE and a bus has been assigned */
  inchargeBusNumber: string | null;
  /** Bus number this user is standing in as in-charge for today, if any (Phase 5) */
  standinBusNumber: string | null;
  isStandIn: boolean;
  setUserIdentity: (identity: "STUDENT" | "TEACHER") => Promise<void>;
  login: (u: string, p: string, cabNumber?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false, username: null, role: null, roleLabel: null, canManageBuses: false, isAdmin: false,
  drivenBusNumber: null, identity: null, inchargeBusNumber: null, standinBusNumber: null, isStandIn: false,
  setUserIdentity: async () => {},
  login: async () => {}, logout: () => {},
});

const labelFor = (role: CurrentUser["role"] | null, canManage: boolean): string | null => {
  if (role === "STAFF") return "Transport Staff";
  if (role === "ADMIN") return "Administrator";
  if (role === "DRIVER") return "Driver";
  // Django superusers keep the default STUDENT profile but can manage buses
  if (canManage) return "Administrator";
  return role === "STUDENT" ? "Student" : null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access_token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));
  const [role, setRole] = useState<CurrentUser["role"] | null>(
    localStorage.getItem("role") as CurrentUser["role"] | null
  );
  const [canManageBuses, setCanManageBuses] = useState(localStorage.getItem("can_manage_buses") === "1");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("is_admin") === "1");
  const [drivenBusNumber, setDrivenBusNumber] = useState<string | null>(localStorage.getItem("driven_bus_number"));
  const [identity, setIdentityState] = useState<CurrentUser["identity"]>(
    localStorage.getItem("identity") as CurrentUser["identity"] | null
  );
  const [inchargeBusNumber, setInchargeBusNumber] = useState<string | null>(localStorage.getItem("incharge_bus_number"));
  const [standinBusNumber, setStandinBusNumber] = useState<string | null>(localStorage.getItem("standin_bus_number"));

  const applyUser = useCallback((me: CurrentUser | null) => {
    if (me) {
      localStorage.setItem("role", me.role);
      localStorage.setItem("can_manage_buses", me.can_manage_buses ? "1" : "0");
      localStorage.setItem("is_admin", me.is_admin ? "1" : "0");
      if (me.driven_bus_number) localStorage.setItem("driven_bus_number", me.driven_bus_number);
      else localStorage.removeItem("driven_bus_number");
      if (me.identity) localStorage.setItem("identity", me.identity);
      else localStorage.removeItem("identity");
      if (me.incharge_bus_number) localStorage.setItem("incharge_bus_number", me.incharge_bus_number);
      else localStorage.removeItem("incharge_bus_number");
      if (me.standin_bus_number) localStorage.setItem("standin_bus_number", me.standin_bus_number);
      else localStorage.removeItem("standin_bus_number");
    } else {
      localStorage.removeItem("role");
      localStorage.removeItem("can_manage_buses");
      localStorage.removeItem("is_admin");
      localStorage.removeItem("driven_bus_number");
      localStorage.removeItem("identity");
      localStorage.removeItem("incharge_bus_number");
      localStorage.removeItem("standin_bus_number");
    }
    setRole(me?.role ?? null);
    setCanManageBuses(me?.can_manage_buses ?? false);
    setIsAdmin(me?.is_admin ?? false);
    setDrivenBusNumber(me?.driven_bus_number ?? null);
    setIdentityState(me?.identity ?? null);
    setInchargeBusNumber(me?.incharge_bus_number ?? null);
    setStandinBusNumber(me?.standin_bus_number ?? null);
  }, []);

  // Refresh role on page load in case it changed since the last visit
  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    getMe()
      .then(applyUser)
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 401) applyUser(null);
      });
  }, [applyUser]);

  const login = async (u: string, p: string, cabNumber?: string) => {
    const data = await loginAPI(u, p, cabNumber);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("username", u);
    setIsLoggedIn(true);
    setUsername(u);
    try {
      applyUser(await getMe());
    } catch {
      applyUser(null); // signed in, but role unknown: fall back to view-only
    }
  };

  const logout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUsername(null);
    setRole(null);
    setCanManageBuses(false);
    setIsAdmin(false);
    setDrivenBusNumber(null);
    setIdentityState(null);
    setInchargeBusNumber(null);
    setStandinBusNumber(null);
  };

  const setUserIdentity = async (value: "STUDENT" | "TEACHER") => {
    const me = await setIdentityAPI(value);
    applyUser(me);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn, username, role, roleLabel: labelFor(role, canManageBuses),
        canManageBuses: isLoggedIn && canManageBuses, isAdmin: isLoggedIn && isAdmin,
        drivenBusNumber, identity, inchargeBusNumber, standinBusNumber, isStandIn: !!standinBusNumber, setUserIdentity, login, logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
