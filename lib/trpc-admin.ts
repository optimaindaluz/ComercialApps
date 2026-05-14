// Helper para obtener el token de admin y añadirlo a las cabeceras tRPC
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ADMIN_TOKEN_KEY = "admin_token";

export async function getAdminToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  }
  try {
    return await SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}
