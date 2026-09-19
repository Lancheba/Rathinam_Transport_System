import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { login as loginAPI, getMe } from "../api/endpoints";
import type { CurrentUser } from "../types";

interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  role: CurrentUser["role"] | null;
  /** Human-friendly role for the top bar, e.g. "Transport Staff" */
  roleLabel: string | null;
  /** True for admins and transport staff: they can add and edit buses */
  canManageBuses: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false, username: null, role: null, roleLabel: null, canManageBuses: false,
  login: async () => {}, logout: () => {},
});

const labelFor = (role: CurrentUser["role"] | null, canManage: boolean): string | null => {
  if (role === "STAFF") return "Transport Staff";
  if (role === "ADMIN") return "Administrator";
  // Django superusers keep the default STUDENT profile but can manage buses
  if (canManage) return "Administrator";
  return role === "STUDENT" ? "Student" : null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access_token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));
  // Cached so the Add Bus button doesn't pop in after every page reload.
  // The server still enforces permissions on every request.
  const [role, setRole] = useState<CurrentUser["role"] | null>(
    localStorage.getItem("role") as CurrentUser["role"] | null
  );
  const [canManageBuses, setCanManageBuses] = useState(localStorage.getItem("can_manage_buses") === "1");

  const applyUser = useCallback((me: CurrentUser | null) => {
    if (me) {
      localStorage.setItem("role", me.role);
      localStorage.setItem("can_manage_buses", me.can_manage_buses ? "1" : "0");
    } else {
      localStorage.removeItem("role");
      localStorage.removeItem("can_manage_buses");
    }
    setRole(me?.role ?? null);
    setCanManageBuses(me?.can_manage_buses ?? false);
  }, []);

  // Refresh role on page load in case it changed since the last visit
  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    getMe()
      .then(applyUser)
      .catch((err) => {
        // Session is gone: stop showing admin-only controls
        if (axios.isAxiosError(err) && err.response?.status === 401) applyUser(null);
      });
  }, [applyUser]);

  const login = async (u: string, p: string) => {
    const data = await loginAPI(u, p);
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
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn, username, role, roleLabel: labelFor(role, canManageBuses),
        canManageBuses: isLoggedIn && canManageBuses, login, logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
