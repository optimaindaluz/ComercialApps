import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useCommercialAuth } from "@/lib/commercial-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type ActiveModal = "none" | "editProfile" | "changePassword" | "deleteAccount";

export default function PerfilScreen() {
  const colors = useColors();
  const { user, login, logout } = useCommercialAuth();
  const utils = trpc.useUtils();
  const { data: stats } = trpc.leads.stats.useQuery(undefined, { enabled: !!user });
  const { data: meData, refetch: refetchMe } = trpc.commercial.me.useQuery(undefined, { enabled: !!user });

  const [activeModal, setActiveModal] = useState<ActiveModal>("none");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const updateProfileMutation = trpc.commercial.updateProfile.useMutation({
    onSuccess: async () => {
      await refetchMe();
      setActiveModal("none");
      Alert.alert("✅ Perfil actualizado", "Tus datos han sido guardados.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const deleteAccountMutation = trpc.commercial.deleteAccount.useMutation({
    onSuccess: async () => {
      await logout();
      router.replace("/login" as any);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar cuenta",
      "Esta acción es permanente. Se eliminarán todos tus datos, leads y negocios. ¿Estás seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar cuenta",
          style: "destructive",
          onPress: () => deleteAccountMutation.mutate(),
        },
      ]
    );
  };

  const changePasswordMutation = trpc.commercial.changePassword.useMutation({
    onSuccess: () => {
      setActiveModal("none");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      Alert.alert("✅ Contraseña cambiada", "Tu contraseña ha sido actualizada.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const uploadAvatarMutation = trpc.commercial.uploadAvatar.useMutation({
    onSuccess: async () => {
      await refetchMe();
      setUploadingAvatar(false);
    },
    onError: (err) => {
      setUploadingAvatar(false);
      Alert.alert("Error", err.message);
    },
  });

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería para cambiar la foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert("Error", "No se pudo leer la imagen"); return; }
    setUploadingAvatar(true);
    uploadAvatarMutation.mutate({
      fileName: `avatar-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      base64Data: asset.base64,
    });
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert("Error", "No se pudo leer la imagen"); return; }
    setUploadingAvatar(true);
    uploadAvatarMutation.mutate({
      fileName: `avatar-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      base64Data: asset.base64,
    });
  };

  const handleAvatarPress = () => {
    Alert.alert("Foto de perfil", "¿Cómo quieres cambiar tu foto?", [
      { text: "Cámara", onPress: handleTakePhoto },
      { text: "Galería", onPress: handlePickAvatar },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      if (!window.confirm("¿Seguro que quieres cerrar sesión?")) return;
      await logout();
      router.replace("/login" as any);
    } else {
      Alert.alert("Cerrar sesión", "¿Seguro que quieres cerrar sesión?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login" as any);
          },
        },
      ]);
    }
  };

  const openEditProfile = () => {
    setEditName(meData?.fullName ?? user?.fullName ?? "");
    setEditEmail(meData?.email ?? user?.email ?? "");
    setActiveModal("editProfile");
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) { Alert.alert("Error", "El nombre no puede estar vacío"); return; }
    updateProfileMutation.mutate({ fullName: editName.trim(), email: editEmail.trim() || undefined });
  };

  const handleChangePassword = () => {
    if (!currentPwd || !newPwd || !confirmPwd) { Alert.alert("Error", "Rellena todos los campos"); return; }
    if (newPwd !== confirmPwd) { Alert.alert("Error", "Las contraseñas nuevas no coinciden"); return; }
    if (newPwd.length < 9 || !/[A-Z]/.test(newPwd) || !/[0-9]/.test(newPwd) || !/[^A-Za-z0-9]/.test(newPwd)) {
      Alert.alert("Contraseña débil", "La nueva contraseña debe tener mínimo 9 caracteres, una mayúscula, un número y un carácter especial.");
      return;
    }
    changePasswordMutation.mutate({ currentPassword: currentPwd, newPassword: newPwd });
  };

  const avatarUrl = meData?.avatarUrl ?? null;
  const displayName = meData?.fullName ?? user?.fullName ?? "";
  const displayEmail = meData?.email ?? user?.email ?? "";
  const displayUsername = user?.username ?? "";

  const styles = StyleSheet.create({
    avatarSection: { alignItems: "center", paddingTop: 32, paddingBottom: 24 },
    avatarWrap: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
      marginBottom: 14, overflow: "hidden",
      borderWidth: 3, borderColor: colors.primary + "40",
    },
    avatarText: { fontSize: 38, fontWeight: "800", color: "#fff" },
    cameraOverlay: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center", paddingVertical: 6,
    },
    cameraIcon: { fontSize: 16 },
    userName: { fontSize: 22, fontWeight: "800", color: colors.foreground },
    userHandle: { fontSize: 14, color: colors.muted, marginTop: 2 },
    userEmail: { fontSize: 13, color: colors.muted, marginTop: 4 },
    statsRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 28, gap: 12 },
    statCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 14,
      padding: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border,
    },
    statValue: { fontSize: 26, fontWeight: "800", color: colors.primary },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, textAlign: "center" },
    section: { marginHorizontal: 20, marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
    menuCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    menuItem: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 15,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    menuItemLast: { borderBottomWidth: 0 },
    menuIcon: { fontSize: 20, marginRight: 14, width: 28 },
    menuText: { flex: 1, fontSize: 15, color: colors.foreground, fontWeight: "500" },
    menuArrow: { fontSize: 14, color: colors.muted },
    logoutBtn: {
      marginHorizontal: 20, backgroundColor: colors.error + "15",
      borderRadius: 14, paddingVertical: 16, alignItems: "center",
      marginBottom: 12, borderWidth: 1, borderColor: colors.error + "30",
    },
    logoutBtnText: { color: colors.error, fontWeight: "700", fontSize: 16 },
    deleteAccountBtn: {
      marginHorizontal: 20, backgroundColor: "transparent",
      borderRadius: 14, paddingVertical: 12, alignItems: "center",
      marginBottom: 40,
    },
    deleteAccountBtnText: { color: colors.muted, fontSize: 14, textDecorationLine: "underline" },
    versionText: { textAlign: "center", fontSize: 12, color: colors.muted, marginBottom: 24 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40,
    },
    modalTitle: { fontSize: 20, fontWeight: "800", color: colors.foreground, marginBottom: 20 },
    label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6, marginTop: 14 },
    input: {
      backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 16, color: colors.foreground,
    },
    modalBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 20 },
    modalBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    cancelBtn: { alignItems: "center", marginTop: 12, paddingVertical: 8 },
    cancelBtnText: { color: colors.muted, fontSize: 15 },
  });

  if (!user) return null;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handleAvatarPress} disabled={uploadingAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96 }} />
            ) : (
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            )}
            {uploadingAvatar ? (
              <View style={styles.cameraOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : (
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userHandle}>@{displayUsername}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
        </View>

        {/* Estadísticas */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.totalLeads ?? 0}</Text>
            <Text style={styles.statLabel}>Leads totales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.newLeads ?? 0}</Text>
            <Text style={styles.statLabel}>Nuevos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.totalBusinesses ?? 0}</Text>
            <Text style={styles.statLabel}>Negocios</Text>
          </View>
        </View>

        {/* Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MI CUENTA</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={openEditProfile}>
              <Text style={styles.menuIcon}>✏️</Text>
              <Text style={styles.menuText}>Editar perfil</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleAvatarPress}>
              <Text style={styles.menuIcon}>📷</Text>
              <Text style={styles.menuText}>Cambiar foto de perfil</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => setActiveModal("changePassword")}>
              <Text style={styles.menuIcon}>🔒</Text>
              <Text style={styles.menuText}>Cambiar contraseña</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mi Zona */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MI ZONA</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/(tabs)/mi-qr" as any)}>
              <Text style={styles.menuIcon}>📱</Text>
              <Text style={styles.menuText}>Mi QR Personal</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/(tabs)/negocios" as any)}>
              <Text style={styles.menuIcon}>🏢</Text>
              <Text style={styles.menuText}>Mis negocios</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={() => router.push("/(tabs)/leads" as any)}>
              <Text style={styles.menuIcon}>📋</Text>
              <Text style={styles.menuText}>Mis leads</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Eliminar cuenta */}
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount} disabled={deleteAccountMutation.isPending}>
          {deleteAccountMutation.isPending
            ? <ActivityIndicator color={colors.muted} size="small" />
            : <Text style={styles.deleteAccountBtnText}>Eliminar cuenta</Text>}
        </TouchableOpacity>
        <Text style={styles.versionText}>ComercialApp v3.0 · Optima Indaluz</Text>
      </ScrollView>

      {/* Modal: Editar perfil */}
      <Modal visible={activeModal === "editProfile"} animationType="slide" transparent onRequestClose={() => setActiveModal("none")}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar perfil</Text>
            <Text style={styles.label}>NOMBRE COMPLETO</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tu nombre completo"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
            />
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="tu@email.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[styles.modalBtn, updateProfileMutation.isPending && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalBtnText}>Guardar cambios</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveModal("none")}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Cambiar contraseña */}
      <Modal visible={activeModal === "changePassword"} animationType="slide" transparent onRequestClose={() => setActiveModal("none")}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={[styles.modalCard, { marginTop: 100 }]}>
              <Text style={styles.modalTitle}>Cambiar contraseña</Text>
              <Text style={styles.label}>CONTRASEÑA ACTUAL</Text>
              <TextInput
                style={styles.input}
                value={currentPwd}
                onChangeText={setCurrentPwd}
                placeholder="Tu contraseña actual"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPwd}
              />
              <Text style={styles.label}>NUEVA CONTRASEÑA</Text>
              <TextInput
                style={styles.input}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="Mín. 9 chars, 1 mayúscula, 1 especial"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPwd}
              />
              {newPwd.length > 0 && (
                <View style={{ marginTop: 8, gap: 4 }}>
                  {[
                    { label: "Mínimo 9 caracteres", ok: newPwd.length >= 9 },
                    { label: "Al menos una mayúscula", ok: /[A-Z]/.test(newPwd) },
                    { label: "Al menos un número", ok: /[0-9]/.test(newPwd) },
                    { label: "Al menos un carácter especial", ok: /[^A-Za-z0-9]/.test(newPwd) },
                  ].map((req) => (
                    <View key={req.label} style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: req.ok ? colors.success : colors.error, fontSize: 12, marginRight: 6 }}>{req.ok ? "✓" : "✗"}</Text>
                      <Text style={{ color: req.ok ? colors.success : colors.muted, fontSize: 12 }}>{req.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.label}>CONFIRMAR NUEVA CONTRASEÑA</Text>
              <TextInput
                style={[styles.input, confirmPwd.length > 0 && newPwd !== confirmPwd && { borderColor: colors.error }]}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholder="Repite la nueva contraseña"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPwd}
              />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ marginTop: 8, alignSelf: "flex-end" }}>
                <Text style={{ color: colors.primary, fontSize: 13 }}>{showPwd ? "Ocultar" : "Mostrar"} contraseñas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, changePasswordMutation.isPending && { opacity: 0.7 }]}
                onPress={handleChangePassword}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalBtnText}>Cambiar contraseña</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setActiveModal("none"); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
