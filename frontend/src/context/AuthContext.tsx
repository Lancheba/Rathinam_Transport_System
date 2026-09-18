import React, { createContext, useContext, useState } from "react";
import { login as loginAPI } from "../api/endpoints";

interface AuthContextType {
  isLoggedIn: boolean;
  username: string | null;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false, username: null,
  login: async () => {}, logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access_token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));

  const login = async (u: string, p: string) => {
    const data = await loginAPI(u, p);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    localStorage.setItem("username", u);
    setIsLoggedIn(true);
    setUsername(u);
  };

  const logout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
