import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 9) errors.push("Mínimo 9 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("Al menos una mayúscula");
  if (!/[0-9]/.test(password)) errors.push("Al menos un número");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("Al menos un carácter especial (!@#$%...)");
  return errors;
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom + 16, 32);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);

  const passwordErrors = validatePassword(password);
  const passwordStrong = passwordErrors.length === 0;

  const checkEmailQuery = trpc.commercial.checkEmail.useQuery(
    { email: email.trim().toLowerCase() },
    {
      enabled: false,
      retry: false,
    }
  );

  const handleEmailBlur = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setEmailError(null);
      setEmailValid(false);
      return;
    }
    setEmailChecking(true);
    setEmailError(null);
    try {
      const result = await checkEmailQuery.refetch();
      if (result.data) {
        if (!result.data.valid) {
          setEmailError(result.data.reason ?? "Email no válido");
          setEmailValid(false);
        } else {
          setEmailError(null);
          setEmailValid(true);
        }
      }
    } catch {
      setEmailError(null);
      setEmailValid(false);
    } finally {
      setEmailChecking(false);
    }
  }, [email, checkEmailQuery]);

  const registerMutation = trpc.commercial.register.useMutation({
    onSuccess: () => {
      setRegistered(true);
    },
    onError: (err) => {
      Alert.alert("Error al registrarse", err.message);
    },
  });

  const handleRegister = () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Error", "Por favor rellena todos los campos");
      return;
    }
    if (emailError) {
      Alert.alert("Email no válido", emailError);
      return;
    }
    if (!emailValid) {
      Alert.alert("Email sin verificar", "Por favor espera a que se valide el email o corrígelo");
      return;
    }
    if (!passwordStrong) {
      Alert.alert("Contraseña débil", "La contraseña no cumple los requisitos:\n• " + passwordErrors.join("\n• "));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }
    registerMutation.mutate({
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const styles = StyleSheet.create({
    topSection: {
      paddingTop: 20,
      paddingBottom: 24,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    backButton: { alignSelf: "flex-start", marginBottom: 16, padding: 4 },
    backText: { color: "rgba(255,255,255,0.9)", fontSize: 15 },
    title: { fontSize: 26, fontWeight: "bold", color: "#fff" },
    subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 28,
      paddingBottom: bottomPad,
    },
    label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6, marginTop: 16 },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
    },
    inputError: { borderColor: colors.error },
    inputValid: { borderColor: colors.success },
    errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
    validText: { color: colors.success, fontSize: 12, marginTop: 4 },
    passwordRow: { flexDirection: "row", alignItems: "center" },
    passwordReq: { marginTop: 8, gap: 4 },
    reqItem: { fontSize: 12, flexDirection: "row", alignItems: "center" },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 28,
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
    loginText: { color: colors.muted, fontSize: 14 },
    loginLink: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  });

  // Pantalla de confirmación tras registro exitoso
  if (registered) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={["#0d302c", "#192841", "#1a5d63", "#243663"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.35, 0.65, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-transparent">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 64, marginBottom: 24 }}>⏳</Text>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 12 }}>
            Solicitud enviada
          </Text>
          <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 24, marginBottom: 32 }}>
            Tu cuenta está pendiente de aprobación por el administrador. Recibirás acceso una vez que sea aprobada.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
            onPress={() => router.replace("/login" as any)}
          >
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "700" }}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={["#0d302c", "#192841", "#1a5d63", "#243663"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-transparent">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
          <View style={styles.topSection}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Regístrate como comercial</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>NOMBRE COMPLETO</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre y apellidos"
              placeholderTextColor={colors.muted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>NOMBRE DE USUARIO</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: juan.garcia"
              placeholderTextColor={colors.muted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.label}>EMAIL</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                style={[
                  styles.input,
                  emailError ? styles.inputError : null,
                  emailValid && !emailError ? styles.inputValid : null,
                ]}
                placeholder="tu@email.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError(null);
                  setEmailValid(false);
                }}
                onBlur={handleEmailBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              {emailChecking && (
                <View style={{ position: "absolute", right: 14, top: 14 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
            {emailError ? (
              <Text style={styles.errorText}>✗ {emailError}</Text>
            ) : emailValid ? (
              <Text style={styles.validText}>✓ Email válido y disponible</Text>
            ) : null}

            <Text style={styles.label}>CONTRASEÑA</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Mín. 9 chars, 1 mayúscula, 1 especial"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ marginLeft: 8, padding: 8 }}
              >
                <Text style={{ fontSize: 20 }}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>

            {/* Indicadores de requisitos de contraseña */}
            {password.length > 0 && (
              <View style={styles.passwordReq}>
                {[
                  { label: "Mínimo 9 caracteres", ok: password.length >= 9 },
                  { label: "Al menos una mayúscula", ok: /[A-Z]/.test(password) },
                  { label: "Al menos un número", ok: /[0-9]/.test(password) },
                  { label: "Al menos un carácter especial", ok: /[^A-Za-z0-9]/.test(password) },
                ].map((req) => (
                  <View key={req.label} style={styles.reqItem}>
                    <Text style={{ color: req.ok ? colors.success : colors.error, fontSize: 12, marginRight: 6 }}>
                      {req.ok ? "✓" : "✗"}
                    </Text>
                    <Text style={{ color: req.ok ? colors.success : colors.muted, fontSize: 12 }}>
                      {req.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>CONFIRMAR CONTRASEÑA</Text>
            <TextInput
              style={[styles.input, confirmPassword.length > 0 && password !== confirmPassword && styles.inputError]}
              placeholder="Repite la contraseña"
              placeholderTextColor={colors.muted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
            )}

            <TouchableOpacity
              style={[styles.button, (registerMutation.isPending || !passwordStrong || !!emailError || !emailValid) && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Solicitar cuenta</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}>Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </View>
      </KeyboardAvoidingView>
      </ScreenContainer>
    </View>
  );
}
