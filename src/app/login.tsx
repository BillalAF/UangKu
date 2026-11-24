import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Fontisto from "@expo/vector-icons/Fontisto";
import {
  registerUser,
  loginWithEmail,
  loginWithGoogle,
  UserGender,
  UserStatus,
  PRESET_AVATARS,
} from "../services/authService";

export default function LoginScreen() {
  const router = useRouter();

  // Mode: "login" atau "register"
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Field Form
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [gender, setGender] = useState<UserGender>("Laki-laki");
  const [status, setStatus] = useState<UserStatus>("Mahasiswa");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>("");

  const genders: UserGender[] = ["Laki-laki", "Perempuan"];
  const statuses: UserStatus[] = ["Mahasiswa", "Siswa", "Pekerja", "Lainnya"];

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Perhatian", "Silakan masukkan email Anda.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await loginWithEmail(email, password);
      if (res.success) {
        Alert.alert("Berhasil", "Selamat datang kembali di UangKu!");
        router.replace("/");
      } else {
        Alert.alert("Gagal Masuk", res.error || "Email atau kata sandi tidak sesuai.");
      }
    } catch (e: any) {
      Alert.alert("Kendala", e?.message || "Tidak dapat memproses login saat ini.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Perhatian", "Silakan isi nama lengkap Anda.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Perhatian", "Silakan masukkan email yang valid.");
      return;
    }
    if (!birthDate.trim()) {
      Alert.alert("Perhatian", "Silakan isi tanggal lahir Anda.");
      return;
    }

    setIsLoading(true);
    try {
      const finalAvatar = customAvatarUrl.trim() || selectedAvatar;
      const res = await registerUser({
        email,
        password,
        fullName,
        birthDate,
        gender,
        status,
        avatarUrl: finalAvatar,
      });

      if (res.success) {
        Alert.alert("Pendaftaran Berhasil", "Akun UangKu Anda siap digunakan!");
        router.replace("/");
      } else {
        Alert.alert("Gagal Mendaftar", res.error || "Terjadi kesalahan saat pendaftaran.");
      }
    } catch (e: any) {
      Alert.alert("Kendala", e?.message || "Tidak dapat memproses pendaftaran.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        Alert.alert("Berhasil", "Akun Google Anda berhasil terhubung!");
        router.replace("/");
      } else {
        Alert.alert("Gagal", res.error || "Gagal menghubungkan akun Google.");
      }
    } catch (e: any) {
      Alert.alert("Kendala", e?.message || "Gagal autentikasi Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Bar dengan Tombol Lewati */}
          <View style={styles.topBarRow}>
            <View style={styles.logoBadge}>
              <Fontisto name="wallet" size={16} color="#6400de" />
              <Text style={styles.logoText}>UangKu</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace("/")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.skipButtonText}>Nanti Saja</Text>
            </TouchableOpacity>
          </View>

          {/* Judul & Sapaan */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>
              {authMode === "login" ? "Selamat Datang" : "Mulai Kelola Uangmu"}
            </Text>
            <Text style={styles.subTitle}>
              {authMode === "login"
                ? "Masuk untuk menyinkronkan data dan prediksi keuangan harianmu."
                : "Daftar untuk personalisasi alokasi cerdas dan pencatatan otomatis."}
            </Text>
          </View>

          {/* Mode Switcher (Pill Tab) */}
          <View style={styles.modeSwitchWrapper}>
            <TouchableOpacity
              style={[
                styles.modeTabBtn,
                authMode === "login" && styles.modeTabBtnActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setAuthMode("login")}
            >
              <Text
                style={[
                  styles.modeTabText,
                  authMode === "login" && styles.modeTabTextActive,
                ]}
              >
                Masuk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTabBtn,
                authMode === "register" && styles.modeTabBtnActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setAuthMode("register")}
            >
              <Text
                style={[
                  styles.modeTabText,
                  authMode === "register" && styles.modeTabTextActive,
                ]}
              >
                Daftar Akun
              </Text>
            </TouchableOpacity>
          </View>

          {/* FORM MASUK (LOGIN) */}
          {authMode === "login" ? (
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="nama@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.fieldLabel}>Kata Sandi</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={styles.primarySubmitBtn}
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primarySubmitBtnText}>Masuk ke Akun</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>atau</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                activeOpacity={0.8}
                onPress={handleGoogleAuth}
                disabled={isLoading}
              >
                <Fontisto name="google" size={16} color="#dc2626" />
                <Text style={styles.googleButtonText}>Lanjutkan dengan Google</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* FORM DAFTAR (REGISTER) */
            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Nama Lengkap</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Ahmad Rizky"
                placeholderTextColor="#9ca3af"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="nama@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.fieldLabel}>Kata Sandi</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Text style={styles.fieldLabel}>Tanggal Lahir</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD (Contoh: 2002-08-17)"
                placeholderTextColor="#9ca3af"
                value={birthDate}
                onChangeText={setBirthDate}
              />

              {/* Pilihan Jenis Kelamin */}
              <Text style={styles.fieldLabel}>Jenis Kelamin</Text>
              <View style={styles.pillSelectorRow}>
                {genders.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.choicePill,
                      gender === g && styles.choicePillActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        gender === g && styles.choicePillTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pilihan Status */}
              <Text style={styles.fieldLabel}>Status Saat Ini</Text>
              <View style={styles.pillSelectorRow}>
                {statuses.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.choicePill,
                      status === s && styles.choicePillActive,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setStatus(s)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        status === s && styles.choicePillTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Bagian Foto Profil (Opsional) */}
              <Text style={styles.fieldLabel}>Foto Profil (Opsional)</Text>
              <View style={styles.avatarSectionBox}>
                <View style={styles.avatarPreviewContainer}>
                  {selectedAvatar || customAvatarUrl.trim() ? (
                    <Image
                      source={{ uri: customAvatarUrl.trim() || selectedAvatar! }}
                      style={styles.avatarPreviewImage}
                    />
                  ) : (
                    <View style={styles.avatarFallbackCircle}>
                      <Fontisto name="person" size={24} color="#6400de" />
                    </View>
                  )}
                </View>

                <View style={styles.avatarRightCol}>
                  <Text style={styles.avatarHintTitle}>Pilih Avatar Siap Pakai:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetScrollContent}
                  >
                    {PRESET_AVATARS.map((url, idx) => (
                      <TouchableOpacity
                        key={`av-${idx}`}
                        style={[
                          styles.presetAvatarBtn,
                          selectedAvatar === url && styles.presetAvatarBtnActive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedAvatar(url);
                          setCustomAvatarUrl("");
                        }}
                      >
                        <Image source={{ uri: url }} style={styles.presetImage} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {(selectedAvatar || customAvatarUrl) && (
                    <TouchableOpacity
                      style={styles.removeAvatarBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedAvatar(null);
                        setCustomAvatarUrl("");
                      }}
                    >
                      <Text style={styles.removeAvatarText}>
                        Gunakan Logo Default (Fontisto)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.primarySubmitBtn}
                activeOpacity={0.8}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primarySubmitBtnText}>Buat Akun Sekarang</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>atau</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                activeOpacity={0.8}
                onPress={handleGoogleAuth}
                disabled={isLoading}
              >
                <Fontisto name="google" size={16} color="#dc2626" />
                <Text style={styles.googleButtonText}>Daftar dengan Google</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  logoText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    paddingVertical: 4,
  },
  titleSection: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 19,
  },
  modeSwitchWrapper: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 14,
    padding: 3,
    marginBottom: 18,
  },
  modeTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  modeTabBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  modeTabTextActive: {
    color: "#6400de",
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 10,
  },
  pillSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  choicePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  choicePillActive: {
    backgroundColor: "#ede9fe",
    borderColor: "#6400de",
  },
  choicePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  choicePillTextActive: {
    color: "#6400de",
  },
  avatarSectionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  avatarPreviewContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
  },
  avatarPreviewImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallbackCircle: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRightCol: {
    flex: 1,
  },
  avatarHintTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
  },
  presetScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  presetAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  presetAvatarBtnActive: {
    borderColor: "#6400de",
  },
  presetImage: {
    width: "100%",
    height: "100%",
  },
  removeAvatarBtn: {
    marginTop: 6,
  },
  removeAvatarText: {
    fontSize: 11,
    color: "#6400de",
    fontWeight: "600",
  },
  primarySubmitBtn: {
    backgroundColor: "#6400de",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  primarySubmitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    height: 48,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
});
