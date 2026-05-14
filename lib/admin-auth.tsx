import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ADMIN_TOKEN_KEY = "admin_token";
const ADMIN_USER_KEY = "admin_user";

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  adminToken: string | null;
  isLoading: boolean;
  setAdminSession: (token: string, admin: AdminUser) => Promise<void>;
  clearAdminSession: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  adminToken: null,
  isLoading: true,
  setAdminSession: async () => {},
  clearAdminSession: async () => {},
});

async function storeAdminToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, token);
  }
}

async function getStoredAdminToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  }
  try {
    return await SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function removeAdminToken() {
  if (Platform.OS === "web") {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  } else {
    await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY);
    await SecureStore.deleteItemAsync(ADMIN_USER_KEY);
  }
}

async function storeAdminUser(admin: AdminUser) {
  const json = JSON.stringify(admin);
  if (Platform.OS === "web") {
    localStorage.setItem(ADMIN_USER_KEY, json);
  } else {
    await SecureStore.setItemAsync(ADMIN_USER_KEY, json);
  }
}

async function getStoredAdminUser(): Promise<AdminUser | null> {
  try {
    let json: string | null = null;
    if (Platform.OS === "web") {
      json = typeof window !== "undefined" ? localStorage.getItem(ADMIN_USER_KEY) : null;
    } else {
      json = await SecureStore.getItemAsync(ADMIN_USER_KEY);
    }
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const token = await getStoredAdminToken();
      const user = await getStoredAdminUser();
      if (token && user) {
        setAdminToken(token);
        setAdmin(user);
      }
      setIsLoading(false);
    }
    loadSession();
  }, []);

  const setAdminSession = async (token: string, adminUser: AdminUser) => {
    await storeAdminToken(token);
    await storeAdminUser(adminUser);
    setAdminToken(token);
    setAdmin(adminUser);
  };

  const clearAdminSession = async () => {
    await removeAdminToken();
    setAdminToken(null);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, adminToken, isLoading, setAdminSession, clearAdminSession }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
