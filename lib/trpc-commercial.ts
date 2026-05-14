// Cliente tRPC que inyecta el token del comercial en cada petición
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const trpc = createTRPCReact<AppRouter>();

const TOKEN_KEY = "commercial_token";

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  }
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers: async () => {
          const token = await getStoredToken();
          return token ? { "x-commercial-token": token } : {};
        },
      }),
    ],
  });
}
