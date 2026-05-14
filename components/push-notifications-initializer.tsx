import { useCommercialAuth } from "@/lib/commercial-auth";
import { usePushNotifications } from "@/hooks/use-push-notifications";

/**
 * Componente que inicializa las notificaciones push cuando el comercial está autenticado.
 * Debe estar dentro del CommercialAuthProvider y del tRPC Provider.
 */
export function PushNotificationsInitializer() {
  const { user } = useCommercialAuth();
  usePushNotifications(!!user);
  return null;
}
