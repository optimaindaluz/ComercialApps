import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { trpc } from "@/lib/trpc";

// Configurar el handler para mostrar notificaciones en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(isAuthenticated: boolean) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const registerTokenMutation = trpc.pushNotifications.registerToken.useMutation();

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;

    async function registerForPushNotifications() {
      try {
        // Configurar canal de Android
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Nuevos leads",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#1E40AF",
          });
        }

        // Solicitar permisos
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        setPermissionStatus(finalStatus);

        if (finalStatus !== "granted") {
          console.log("[Push] Permission not granted");
          return;
        }

        // Obtener token de Expo
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: undefined, // Expo Go usa el projectId del manifest automáticamente
        });

        const token = tokenData.data;
        setExpoPushToken(token);

        // Registrar el token en el servidor
        await registerTokenMutation.mutateAsync({ token });
        console.log("[Push] Token registered:", token);
      } catch (err) {
        console.warn("[Push] Error registering for push notifications:", err);
      }
    }

    registerForPushNotifications();

    // Escuchar notificaciones recibidas en primer plano
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[Push] Notification received:", notification);
    });

    // Escuchar cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[Push] Notification response:", response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);

  return { expoPushToken, permissionStatus };
}
