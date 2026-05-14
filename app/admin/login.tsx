import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAdminAuth } from "@/lib/admin-auth";
import { useColors } from "@/hooks/use-colors";

export default function AdminLoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setAdminSession } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: async (data) => {
      await setAdminSession(data.token, data.admin);
      router.replace("/admin/dashboard" as never);
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Introduce usuario y contraseña");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password });
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View style={[styles.iconContainer, { backgroundColor: "#7C3AED" }]}>
            <Text style={{ fontSize: 32 }}>🛡️</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Panel Administrador</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Optima Indaluz — Acceso restringido</Text>
        </View>

        {/* Form */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Usuario</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Nombre de usuario"
            placeholderTextColor={colors.muted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            returnKeyType="next"
          />

          <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Contraseña</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, paddingRight: 50 }]}
              placeholder="Contraseña"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={{ position: "absolute", right: 14, top: 14 }}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={{ color: colors.muted, fontSize: 18 }}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#7C3AED", marginTop: 24, opacity: loginMutation.isPending ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar como administrador</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={{ marginTop: 20, alignItems: "center" }} onPress={() => router.back()}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>← Volver al acceso de comerciales</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
