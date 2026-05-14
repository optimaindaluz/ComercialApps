import { useState, useRef, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { useCommercialAuth } from "@/lib/commercial-auth";
import { useAdminAuth } from "@/lib/admin-auth";
import { useColors } from "@/hooks/use-colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useCommercialAuth();
  const { setAdminSession } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Logo visible desde el primer frame (sin fade-in — imagen pre-cargada en _layout.tsx)
  const logoOpacity = useRef(new Animated.Value(1)).current;

  // Animación de expansión de la tarjeta
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.timing(expandAnim, {
      toValue,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [expanded, expandAnim]);



  const loginMutation = trpc.commercial.login.useMutation({
    onSuccess: async (data) => {
      setErrorMsg(null);
      if (data.isAdmin && data.admin) {
        await setAdminSession(data.token, data.admin);
        router.replace("/admin/dashboard" as any);
      } else if (data.commercial) {
        await login(data.token, data.commercial);
        router.replace("/(tabs)");
      }
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  const handleLogin = () => {
    setErrorMsg(null);
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Por favor rellena todos los campos");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password });
  };

  // Altura animada de la sección expandible (campos de formulario)
  const expandableHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });

  // Opacidad animada del contenido expandible
  const expandableOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  // Rotación del indicador de flecha
  const arrowRotation = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const bottomPad = Math.max(insets.bottom + 16, 32);

  const styles = StyleSheet.create({
    topSection: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 20,
      paddingBottom: 8,
    },
    logoWrapper: {
      width: SCREEN_WIDTH - 48,
      height: (SCREEN_WIDTH - 48) * 0.42,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
      borderRadius: 20,
      overflow: "hidden",
    },
    appName: {
      fontSize: 26,
      fontWeight: "bold",
      color: "#fff",
      letterSpacing: 0.5,
      marginTop: 0,
    },
    appSubtitle: {
      fontSize: 13,
      color: "rgba(255,255,255,0.8)",
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: bottomPad,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardTitleBlock: { flex: 1 },
    cardTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground },
    cardSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
    arrowContainer: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    arrowText: { fontSize: 18, color: colors.muted },
    label: { fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 5, marginTop: 14 },
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
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: colors.foreground,
    },
    inputError: { borderColor: "#EF4444" },
    errorBox: {
      backgroundColor: "#FEE2E2",
      borderRadius: 10,
      padding: 10,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    errorText: { color: "#DC2626", fontSize: 13, flex: 1, lineHeight: 18 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      marginTop: 20,
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    forgotRow: { alignItems: "center", marginTop: 10 },
    forgotLink: { color: colors.primary, fontSize: 13, fontWeight: "600" },
    registerRow: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
    registerText: { color: colors.muted, fontSize: 13 },
    registerLink: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  });

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
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {/* Sección superior con logo */}
          <View style={styles.topSection}>
            <View style={styles.logoWrapper}>
              <Image
                source={require("../assets/images/logo-optima-nuevo.png")}
                style={{ width: SCREEN_WIDTH - 48, height: (SCREEN_WIDTH - 48) * 0.42, resizeMode: "cover" }}
              />
            </View>
          </View>

          {/* Tarjeta de login — desplegable */}
          <View style={styles.card}>
            {/* Cabecera siempre visible — pulsar para expandir */}
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={toggleExpand}
              activeOpacity={0.7}
            >
              <View style={styles.cardTitleBlock}>
                <Text style={styles.cardTitle}>Bienvenido</Text>
                <Text style={styles.cardSubtitle}>Inicia sesión con tu cuenta de comercial</Text>
              </View>
              <Animated.View
                style={[styles.arrowContainer, { transform: [{ rotate: arrowRotation }] }]}
              >
                <Text style={styles.arrowText}>⌄</Text>
              </Animated.View>
            </TouchableOpacity>

            {/* Contenido expandible animado */}
            <Animated.View style={{ height: expandableHeight, overflow: "hidden" }}>
              <Animated.View style={{ opacity: expandableOpacity }}>
                <Text style={styles.label}>USUARIO</Text>
                <View style={[styles.inputRow, !!errorMsg && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Tu nombre de usuario"
                    placeholderTextColor={colors.muted}
                    value={username}
                    onChangeText={(t) => { setUsername(t); setErrorMsg(null); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                <Text style={styles.label}>CONTRASEÑA</Text>
                <View style={[styles.inputRow, !!errorMsg && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Tu contraseña"
                    placeholderTextColor={colors.muted}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setErrorMsg(null); }}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={{ paddingHorizontal: 14 }}
                    onPress={() => setShowPassword(v => !v)}
                  >
                    <Text style={{ fontSize: 18 }}>{showPassword ? "🙈" : "👁️"}</Text>
                  </TouchableOpacity>
                </View>

                {errorMsg && (
                  <View style={styles.errorBox}>
                    <Text style={{ fontSize: 16 }}>⚠️</Text>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.button, loginMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Entrar</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {/* Links siempre visibles */}
            <View style={styles.forgotRow}>
              <TouchableOpacity onPress={() => router.push("/forgot-password" as any)}>
                <Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => router.push("/register" as any)}>
                <Text style={styles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      </ScreenContainer>
    </View>
  );
}
