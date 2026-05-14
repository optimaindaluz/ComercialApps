import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "commercial_token";
const USER_KEY = "commercial_user";

export interface CommercialUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  personalQrCode: string;
  avatarUrl?: string | null;
  accountStatus?: string;
}

interface CommercialAuthContextType {
  user: CommercialUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: CommercialUser) => Promise<void>;
  logout: () => Promise<void>;
}

const CommercialAuthContext = createContext<CommercialAuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

async function saveToStorage(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getFromStorage(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeFromStorage(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export function CommercialAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CommercialUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar sesión guardada al arrancar
    (async () => {
      try {
        const savedToken = await getFromStorage(TOKEN_KEY);
        const savedUser = await getFromStorage(USER_KEY);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {
        // Si hay error, limpiar
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (newToken: string, newUser: CommercialUser) => {
    await saveToStorage(TOKEN_KEY, newToken);
    await saveToStorage(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await removeFromStorage(TOKEN_KEY);
    await removeFromStorage(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <CommercialAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </CommercialAuthContext.Provider>
  );
}

export function useCommercialAuth() {
  return useContext(CommercialAuthContext);
}

export function getToken(): string | null {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  // En nativo, el token ya está en el contexto
  return null;
}
