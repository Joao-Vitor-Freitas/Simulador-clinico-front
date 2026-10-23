"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, sessionExpiredEvent, tokenStore } from "./api";
import type { User } from "./types";

type AuthValue = {
  user: User | null;
  loading: boolean;
  sessionMessage: string;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setSessionMessage("Sua sessão expirou. Entre novamente para continuar.");
    };
    window.addEventListener(sessionExpiredEvent, expired);
    if (!tokenStore.get()) {
      setLoading(false);
      return () => window.removeEventListener(sessionExpiredEvent, expired);
    }
    api
      .me()
      .then(setUser)
      .catch((error: unknown) => {
        if (!(error instanceof ApiError && error.status === 401)) {
          setSessionMessage(
            "Não foi possível verificar sua sessão. Entre novamente.",
          );
        }
      })
      .finally(() => setLoading(false));
    return () => window.removeEventListener(sessionExpiredEvent, expired);
  }, []);
  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.login(email, password);
    tokenStore.set(access_token);
    try {
      setUser(await api.me());
      setSessionMessage("");
    } catch (error) {
      tokenStore.clear();
      throw error;
    }
  }, []);
  const register = useCallback(
    async (email: string, password: string, name: string) => {
      await api.register(email, password, name);
      await login(email, password);
    },
    [login],
  );
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      tokenStore.clear();
      setUser(null);
      setSessionMessage("");
    }
  }, []);
  return (
    <AuthContext.Provider
      value={{ user, loading, sessionMessage, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider ausente");
  return value;
}
