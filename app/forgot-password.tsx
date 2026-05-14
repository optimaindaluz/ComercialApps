import { useState } from "react";
import {
  ActivityIndicator,
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

// Pasos del flujo de recuperación
type Step = "email" | "waiting" | "newPassword" | "success";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom + 16, 32);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commercialId, setCommercialId] = useState<number | null>(null);

  // Paso 1: el usuario solicita el reset → el admin recibirá la notificación
  const requestResetMutation = trpc.commercial.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      setErrorMsg(null);
      setCommercialId(data.commercialId);
      setStep("waiting"); // Esperar a que el admin genere el código
    },
    onError: (err) => setErrorMsg(err.message),
  });

  // Paso 3a: reset con commercialId (flujo normal, viene del paso 1)
  const resetPasswordMutation = trpc.commercial.resetPassword.useMutation({
    onSuccess: () => { setErrorMsg(null); setStep("success"); },
    onError: (err) => setErrorMsg(err.message),
  });

  // Paso 3b: reset con email (flujo directo, el usuario ya tenía el código)
  const resetPasswordByEmailMutation = trpc.commercial.resetPasswordByEmail.useMutation({
    onSuccess: () => { setErrorMsg(null); setStep("success"); },
    onError: (err) => setErrorMsg(err.message),
  });

  const handleRequestCode = () => {
    setErrorMsg(null);
    if (!email.trim()) { setErrorMsg("Por favor introduce tu email"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { setErrorMsg("El email no tiene un formato válido"); return; }
    requestResetMutation.mutate({ email: email.trim() });
  };

  const handleResetPassword = () => {
    setErrorMsg(null);
    if (!code.trim() || code.length !== 6) { setErrorMsg("El código debe tener 6 dígitos"); return; }
    if (!newPassword) { setErrorMsg("Por favor introduce la nueva contraseña"); return; }
    if (newPassword.length < 9) { setErrorMsg("La contraseña debe tener al menos 9 caracteres"); return; }
    if (!/[A-Z]/.test(newPassword)) { setErrorMsg("La contraseña debe tener al menos una mayúscula"); return; }
    if (!/[0-9]/.test(newPassword)) { setErrorMsg("La contraseña debe tener al menos un número"); return; }
    if (!/[^A-Za-z0-9]/.test(newPassword)) { setErrorMsg("La contraseña debe tener al menos un carácter especial"); return; }
    if (newPassword !== confirmPassword) { setErrorMsg("Las contraseñas no coinciden"); return; }
    if (commercialId) {
      // Flujo normal: tenemos el commercialId del paso 1
      resetPasswordMutation.mutate({ commercialId, code: code.trim(), newPassword });
    } else {
      // Flujo directo: el usuario llegó con el código directamente, usamos el email
      if (!email.trim()) { setErrorMsg("Introduce tu email para continuar"); return; }
      resetPasswordByEmailMutation.mutate({ email: email.trim(), code: code.trim(), newPassword });
    }
  };

  const styles = StyleSheet.create({
    topSection: {
      alignItems: "center",
      paddingTop: 60,
      paddingBottom: 40,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    iconText: { fontSize: 36 },
    title: { fontSize: 24, fontWeight: "bold", color: "#fff", letterSpacing: 0.5 },
    subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4, textAlign: "center", paddingHorizontal: 32 },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 32,
      paddingBottom: bottomPad,
    },
    cardTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground, marginBottom: 8 },
    cardSubtitle: { fontSize: 14, color: colors.muted, marginBottom: 24, lineHeight: 20 },
    label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6, marginTop: 16 },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
    },
    input: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
    },
    inputError: { borderColor: "#EF4444" },
    errorBox: {
      backgroundColor: "#FEE2E2",
      borderRadius: 10,
      padding: 12,
      marginTop: 16,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    errorText: { color: "#DC2626", fontSize: 14, flex: 1, lineHeight: 20 },
    // Caja de espera - el usuario espera que el admin le dé el código
    waitingBox: {
      backgroundColor: "#EFF6FF",
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "#BFDBFE",
    },
    waitingIcon: { fontSize: 40, marginBottom: 12 },
    waitingTitle: { fontSize: 16, fontWeight: "700", color: "#1D4ED8", marginBottom: 8, textAlign: "center" },
    waitingText: { fontSize: 13, color: "#3B82F6", textAlign: "center", lineHeight: 20 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 24,
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    backRow: { alignItems: "center", marginTop: 16 },
    backLink: { color: colors.primary, fontSize: 14, fontWeight: "600" },
    successIcon: { fontSize: 64, textAlign: "center", marginBottom: 16 },
    successTitle: { fontSize: 24, fontWeight: "700", color: colors.foreground, textAlign: "center", marginBottom: 12 },
    successText: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22, marginBottom: 32 },
    strengthRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    strengthItem: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11 },
  });

  const getPasswordStrength = (pwd: string) => [
    { label: "9+ chars", ok: pwd.length >= 9 },
    { label: "Mayúscula", ok: /[A-Z]/.test(pwd) },
    { label: "Número", ok: /[0-9]/.test(pwd) },
    { label: "Especial", ok: /[^A-Za-z0-9]/.test(pwd) },
  ];

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
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.topSection}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>🔑</Text>
              </View>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={styles.subtitle}>
                {step === "email" && "Introduce tu email para solicitar el restablecimiento"}
                {step === "waiting" && "Espera el código del administrador"}
                {step === "newPassword" && "Introduce el código y tu nueva contraseña"}
                {step === "success" && "¡Contraseña cambiada con éxito!"}
              </Text>
            </View>

            <View style={styles.card}>
              {/* PASO 1: Introducir email */}
              {step === "email" && (
                <>
                  <Text style={styles.cardTitle}>¿Olvidaste tu contraseña?</Text>
                  <Text style={styles.cardSubtitle}>
                    Introduce el email con el que te registraste. El administrador recibirá tu solicitud y te enviará un código de 6 dígitos.
                  </Text>

                  <Text style={styles.label}>EMAIL</Text>
                  <View style={[styles.inputRow, !!errorMsg && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      placeholder="tu@email.com"
                      placeholderTextColor={colors.muted}
                      value={email}
                      onChangeText={(t) => { setEmail(t); setErrorMsg(null); }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleRequestCode}
                    />
                  </View>

                  {errorMsg && (
                    <View style={styles.errorBox}>
                      <Text style={{ fontSize: 16 }}>⚠️</Text>
                      <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, requestResetMutation.isPending && { opacity: 0.7 }]}
                    onPress={handleRequestCode}
                    disabled={requestResetMutation.isPending}
                  >
                    {requestResetMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Solicitar restablecimiento</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.backRow}>
                    <TouchableOpacity onPress={() => router.back()}>
                      <Text style={styles.backLink}>← Volver al login</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Acceso directo si el admin ya le dio el código */}
                  <View style={[styles.backRow, { marginTop: 8 }]}>
                    <TouchableOpacity onPress={() => { setErrorMsg(null); setStep("waiting"); }}>
                      <Text style={[styles.backLink, { color: "#8B5CF6" }]}>🔑 Ya tengo el código del administrador</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* PASO 2: Pantalla de espera / introducción del código */}
              {step === "waiting" && (
                <>
                  <Text style={styles.cardTitle}>
                    {commercialId ? "Solicitud enviada" : "Introduce el código"}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {commercialId
                      ? "El administrador revisará tu solicitud y te enviará un código de 6 dígitos por teléfono o WhatsApp."
                      : "Introduce el código de 6 dígitos que te ha proporcionado el administrador."
                    }
                  </Text>

                  <View style={styles.waitingBox}>
                    <Text style={styles.waitingIcon}>{commercialId ? "📱" : "🔑"}</Text>
                    <Text style={styles.waitingTitle}>
                      {commercialId ? "Espera el código del administrador" : "Introduce el código recibido"}
                    </Text>
                    <Text style={styles.waitingText}>
                      {commercialId
                        ? "Cuando recibas el código de 6 dígitos, intróducelo abajo para continuar con el cambio de contraseña."
                        : "Escribe el código de 6 dígitos que el administrador te ha enviado por teléfono o WhatsApp."
                      }
                    </Text>
                  </View>

                  <Text style={styles.label}>CÓDIGO RECIBIDO DEL ADMINISTRADOR</Text>
                  <View style={[styles.inputRow, !!errorMsg && styles.inputError]}>
                    <TextInput
                      style={[styles.input, { letterSpacing: 6, textAlign: "center", fontSize: 22, fontWeight: "700" }]}
                      placeholder="000000"
                      placeholderTextColor={colors.muted}
                      value={code}
                      onChangeText={(t) => { setCode(t.replace(/\D/g, "").slice(0, 6)); setErrorMsg(null); }}
                      keyboardType="number-pad"
                      maxLength={6}
                      returnKeyType="done"
                    />
                  </View>

                  {errorMsg && (
                    <View style={styles.errorBox}>
                      <Text style={{ fontSize: 16 }}>⚠️</Text>
                      <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, code.length !== 6 && { opacity: 0.5 }]}
                    onPress={() => {
                      if (code.length !== 6) { setErrorMsg("El código debe tener 6 dígitos"); return; }
                      setErrorMsg(null);
                      setStep("newPassword");
                    }}
                    disabled={code.length !== 6}
                  >
                    <Text style={styles.buttonText}>Continuar con el código →</Text>
                  </TouchableOpacity>

                  <View style={styles.backRow}>
                    <TouchableOpacity onPress={() => { setStep("email"); setCode(""); setErrorMsg(null); }}>
                      <Text style={styles.backLink}>← Volver</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* PASO 3: Nueva contraseña */}
              {step === "newPassword" && (
                <>
                  <Text style={styles.cardTitle}>Nueva contraseña</Text>
                  <Text style={styles.cardSubtitle}>
                    Introduce tu nueva contraseña. Tienes 30 minutos desde que el administrador generó el código.
                  </Text>

                  {/* Si el usuario llegó directamente (sin pasar por el paso 1), pedir el email */}
                  {!commercialId && (
                    <>
                      <Text style={styles.label}>TU EMAIL</Text>
                      <View style={[styles.inputRow, !!errorMsg && styles.inputError]}>
                        <TextInput
                          style={styles.input}
                          placeholder="tu@email.com"
                          placeholderTextColor={colors.muted}
                          value={email}
                          onChangeText={(t) => { setEmail(t); setErrorMsg(null); }}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="next"
                        />
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>NUEVA CONTRASEÑA</Text>
                  <View style={[styles.inputRow, !!errorMsg && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Nueva contraseña"
                      placeholderTextColor={colors.muted}
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); setErrorMsg(null); }}
                      secureTextEntry={!showPassword}
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      style={{ paddingHorizontal: 14 }}
                      onPress={() => setShowPassword(v => !v)}
                    >
                      <Text style={{ fontSize: 18 }}>{showPassword ? "🙈" : "👁️"}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Indicadores de fortaleza */}
                  {newPassword.length > 0 && (
                    <View style={styles.strengthRow}>
                      {getPasswordStrength(newPassword).map((check) => (
                        <Text
                          key={check.label}
                          style={[
                            styles.strengthItem,
                            {
                              backgroundColor: check.ok ? "#DCFCE7" : "#FEE2E2",
                              color: check.ok ? "#16A34A" : "#DC2626",
                            },
                          ]}
                        >
                          {check.ok ? "✓" : "✗"} {check.label}
                        </Text>
                      ))}
                    </View>
                  )}

                  <Text style={styles.label}>CONFIRMAR CONTRASEÑA</Text>
                  <View style={[styles.inputRow, !!errorMsg && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Repite la contraseña"
                      placeholderTextColor={colors.muted}
                      value={confirmPassword}
                      onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(null); }}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleResetPassword}
                    />
                  </View>

                  {errorMsg && (
                    <View style={styles.errorBox}>
                      <Text style={{ fontSize: 16 }}>⚠️</Text>
                      <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, (resetPasswordMutation.isPending || resetPasswordByEmailMutation.isPending) && { opacity: 0.7 }]}
                    onPress={handleResetPassword}
                    disabled={resetPasswordMutation.isPending || resetPasswordByEmailMutation.isPending}
                  >
                    {(resetPasswordMutation.isPending || resetPasswordByEmailMutation.isPending) ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Cambiar contraseña</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.backRow}>
                    <TouchableOpacity onPress={() => { setStep("waiting"); setErrorMsg(null); }}>
                      <Text style={styles.backLink}>← Volver</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* PASO 4: Éxito */}
              {step === "success" && (
                <View style={{ flex: 1, justifyContent: "center", paddingVertical: 32 }}>
                  <Text style={styles.successIcon}>✅</Text>
                  <Text style={styles.successTitle}>¡Contraseña cambiada!</Text>
                  <Text style={styles.successText}>
                    Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
                  </Text>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.replace("/login" as any)}
                  >
                    <Text style={styles.buttonText}>Ir al login</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </View>
  );
}
