import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getAdminToken } from "@/lib/trpc-admin";

const COMMERCIAL_TOKEN_KEY = "commercial_token";

async function getCommercialToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window !== "undefined" ? localStorage.getItem(COMMERCIAL_TOKEN_KEY) : null;
  }
  try {
    return await SecureStore.getItemAsync(COMMERCIAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const sessionToken = await Auth.getSessionToken();
          const commercialToken = await getCommercialToken();
          const adminToken = await getAdminToken();
          const headers: Record<string, string> = {};
          if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
          if (commercialToken) headers["x-commercial-token"] = commercialToken;
          if (adminToken) headers["x-admin-token"] = adminToken;
          return headers;
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
