import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Fontisto from "@expo/vector-icons/Fontisto";
import {
  getCurrentUser,
  updateUserProfile,
  logoutUser,
  subscribeAuthUpdates,
  UserProfile,
  UserGender,
  UserStatus,
  PRESET_AVATARS,
} from "../services/authService";

export default function ProfileScreen() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State Modal Edit Foto
  const [avatarModalVisible, setAvatarModalVisible] = useState<boolean>(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState<string>("");

  // State Modal Edit Data Diri
  const [editProfileModalVisible, setEditProfileModalVisible] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editBirthDate, setEditBirthDate] = useState<string>("");
  const [editGender, setEditGender] = useState<UserGender>("Laki-laki");
  const [editStatus, setEditStatus] = useState<UserStatus>("Mahasiswa");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const genders: UserGender[] = ["Laki-laki", "Perempuan"];
  const statuses: UserStatus[] = ["Mahasiswa", "Siswa", "Pekerja", "Lainnya"];

  const loadUserData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.warn("Gagal memuat profil:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    const unsubscribe = subscribeAuthUpdates((updatedUser) => {
      setUser(updatedUser);
    });
    return () => {
      unsubscribe();
    };
  }, [loadUserData]);

  // Buka modal edit data diri
  const handleOpenEditProfile = () => {
    if (!user) return;
    setEditFullName(user.fullName);
    setEditBirthDate(user.birthDate);
    setEditGender(user.gender);
    setEditStatus(user.status);
    setEditProfileModalVisible(true);
  };

  // Simpan data diri
  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert("Perhatian", "Nama lengkap tidak boleh kosong.");
      return;
    }
    if (!editBirthDate.trim()) {
      Alert.alert("Perhatian", "Tanggal lahir tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateUserProfile({
        fullName: editFullName.trim(),
        birthDate: editBirthDate.trim(),
        gender: editGender,
        status: editStatus,
      });

      if (updated) {
        setUser(updated);
        setEditProfileModalVisible(false);
        Alert.alert("Berhasil", "Data diri Anda berhasil diperbarui.");
      }
    } catch (e: any) {
      Alert.alert("Kendala", e?.message || "Gagal memperbarui data diri.");
    } finally {
      setIsSaving(false);
    }
  };

  // Buka modal ganti foto
  const handleOpenChangeAvatar = () => {
    setTempAvatarUrl(user?.avatarUrl || null);
    setCustomUrlInput("");
    setAvatarModalVisible(true);
  };

  // Simpan foto profil
  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      const finalAvatar = customUrlInput.trim() || tempAvatarUrl;
      const updated = await updateUserProfile({
        avatarUrl: finalAvatar,
      });
      if (updated) {
        setUser(updated);
        setAvatarModalVisible(false);
        Alert.alert("Berhasil", "Foto profil berhasil diperbarui.");
      }
    } catch (e: any) {
      Alert.alert("Kendala", "Gagal memperbarui foto profil.");
    } finally {
      setIsSaving(false);
    }
  };

  // Logout
  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Keluar",
      "Apakah Anda yakin ingin keluar dari akun ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            await logoutUser();
            router.replace("/login" as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#6400de" />
            <Text style={styles.stateSubtitle}>Memuat profil akun...</Text>
          </View>
        ) : !user ? (
          /* JIKA BELUM MASUK AKUN */
          <View style={styles.unauthCard}>
            <View style={styles.unauthIconCircle}>
              <Fontisto name="person" size={32} color="#6400de" />
            </View>
            <Text style={styles.unauthTitle}>Belum Masuk Akun</Text>
            <Text style={styles.unauthSubtitle}>
              Masuk atau buat akun baru untuk menyinkronkan data keuangan ke cloud dan mengaktifkan profil lengkap.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/login" as any)}
            >
              <Text style={styles.primaryBtnText}>Masuk atau Buat Akun</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* JIKA SUDAH LOGIN */
          <>
            {/* 1. KARTU PROFIL UTAMA (FOTO + NAMA + EMAIL + GANTI FOTO) */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.avatarWrapper}>
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Fontisto name="person" size={36} color="#6400de" />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.cameraBadge}
                  activeOpacity={0.8}
                  onPress={handleOpenChangeAvatar}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Fontisto name="camera" size={13} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.profileName}>{user.fullName}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>

              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{user.status}</Text>
              </View>

              <TouchableOpacity
                style={styles.changeAvatarBtn}
                activeOpacity={0.7}
                onPress={handleOpenChangeAvatar}
              >
                <Fontisto name="picture" size={12} color="#6400de" />
                <Text style={styles.changeAvatarBtnText}>Ganti Foto Profil</Text>
              </TouchableOpacity>
            </View>

            {/* 2. BOX-BOX DATA REGISTER */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Data Diri Pengguna</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOpenEditProfile}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.editActionText}>Edit Data</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBoxContainer}>
              {/* Box Nama */}
              <View style={styles.infoBoxItem}>
                <View style={styles.infoIconCircle}>
                  <Fontisto name="user-secret" size={14} color="#6400de" />
                </View>
                <View style={styles.infoContentCol}>
                  <Text style={styles.infoFieldLabel}>Nama Lengkap</Text>
                  <Text style={styles.infoFieldValue}>{user.fullName}</Text>
                </View>
              </View>

              {/* Box Tanggal Lahir */}
              <View style={styles.infoBoxItem}>
                <View style={styles.infoIconCircle}>
                  <Fontisto name="calendar" size={14} color="#6400de" />
                </View>
                <View style={styles.infoContentCol}>
                  <Text style={styles.infoFieldLabel}>Tanggal Lahir</Text>
                  <Text style={styles.infoFieldValue}>{user.birthDate}</Text>
                </View>
              </View>

              {/* Box Jenis Kelamin */}
              <View style={styles.infoBoxItem}>
                <View style={styles.infoIconCircle}>
                  <Fontisto name="venus-mars" size={14} color="#6400de" />
                </View>
                <View style={styles.infoContentCol}>
                  <Text style={styles.infoFieldLabel}>Jenis Kelamin</Text>
                  <Text style={styles.infoFieldValue}>{user.gender}</Text>
                </View>
              </View>

              {/* Box Status */}
              <View style={styles.infoBoxItem}>
                <View style={styles.infoIconCircle}>
                  <Fontisto name="suitcase" size={14} color="#6400de" />
                </View>
                <View style={styles.infoContentCol}>
                  <Text style={styles.infoFieldLabel}>Status Pekerjaan / Studi</Text>
                  <Text style={styles.infoFieldValue}>{user.status}</Text>
                </View>
              </View>

              {/* Box Email */}
              <View style={[styles.infoBoxItem, styles.infoBoxItemLast]}>
                <View style={styles.infoIconCircle}>
                  <Fontisto name="email" size={14} color="#6400de" />
                </View>
                <View style={styles.infoContentCol}>
                  <Text style={styles.infoFieldLabel}>Email Terhubung</Text>
                  <Text style={styles.infoFieldValue}>{user.email}</Text>
                </View>
              </View>
            </View>

            {/* 3. TENTANG APLIKASI & TUGAS AKHIR */}
            <Text style={styles.sectionTitleAlone}>Tentang Aplikasi</Text>
            <View style={styles.infoBoxContainer}>
              <View style={styles.infoBoxItem}>
                <View style={styles.infoIconCircle}>
                  <Fontisto name="shield" size={14} color="#6400de" />
                </View>
                <View style={styles.infoContentCol}>
                  <Text style={styles.infoFieldLabel}>Versi Aplikasi</Text>
                  <Text style={styles.infoFieldValue}>UangKu 1.0.0 (Expo SDK 58)</Text>
                </View>
              </View>

              <View style={styles.infoBoxItem}>
                <View style={styles.infoIconCircle}>
                  <Fontisto name="cloud-refresh" size={14} color="#6400de" />
                </View>
                <View style={styles.infoContentCol}>
                  <Text style={styles.infoFieldLabel}>Arsitektur Backend (Modul 1)</Text>
                  <Text style={styles.infoFieldValue}>Express.js RESTful API + Supabase</Text>
                </View>
              </View>

              <View style={[styles.infoBoxItem, styles.infoBoxItemLast]}>
                <View style={styles.infoIconCircle}>
                  <Fontisto name="bookmark" size={14} color="#6400de" />
                </View>
                <View style={styles.infoContentCol}>
                  <Text style={styles.infoFieldLabel}>Tugas Akhir Praktikum</Text>
                  <Text style={styles.infoFieldValue}>Pemrograman Perangkat Bergerak</Text>
                </View>
              </View>
            </View>

            {/* 4. TOMBOL KELUAR AKUN */}
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <Fontisto name="power" size={14} color="#dc2626" />
              <Text style={styles.logoutButtonText}>Keluar dari Akun</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ====================================================================
          MODAL 1: GANTI FOTO PROFIL
          ==================================================================== */}
      <Modal
        visible={avatarModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Pilih Foto Profil</Text>
              <TouchableOpacity
                onPress={() => setAvatarModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Fontisto name="close" size={14} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Preview Foto Terpilih */}
            <View style={styles.avatarPreviewCenter}>
              {customUrlInput.trim() || tempAvatarUrl ? (
                <Image
                  source={{ uri: customUrlInput.trim() || tempAvatarUrl! }}
                  style={styles.modalAvatarPreview}
                />
              ) : (
                <View style={styles.modalAvatarFallback}>
                  <Fontisto name="person" size={32} color="#6400de" />
                </View>
              )}
            </View>

            {/* Grid Avatar Siap Pakai */}
            <Text style={styles.modalSubHeader}>Pilihan Avatar Minimalis:</Text>
            <View style={styles.presetGrid}>
              {PRESET_AVATARS.map((url, i) => (
                <TouchableOpacity
                  key={`preset-${i}`}
                  style={[
                    styles.presetCircleBtn,
                    tempAvatarUrl === url && styles.presetCircleBtnActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTempAvatarUrl(url);
                    setCustomUrlInput("");
                  }}
                >
                  <Image source={{ uri: url }} style={styles.presetGridImage} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Atau Input Link Foto */}
            <Text style={styles.modalSubHeader}>Atau Masukkan URL Foto Sendiri:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://contoh.com/foto.jpg"
              placeholderTextColor="#9ca3af"
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              autoCapitalize="none"
            />

            {/* Opsi Gunakan Logo Fontisto (Tanpa Foto) */}
            <TouchableOpacity
              style={styles.removeAvatarTextBtn}
              activeOpacity={0.7}
              onPress={() => {
                setTempAvatarUrl(null);
                setCustomUrlInput("");
              }}
            >
              <Fontisto name="trash" size={12} color="#dc2626" />
              <Text style={styles.removeAvatarText}>
                Gunakan Logo User Default (Fontisto)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryModalSaveBtn}
              activeOpacity={0.8}
              onPress={handleSaveAvatar}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryModalSaveBtnText}>Simpan Foto</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ====================================================================
          MODAL 2: EDIT DATA DIRI
          ==================================================================== */}
      <Modal
        visible={editProfileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Data Diri</Text>
              <TouchableOpacity
                onPress={() => setEditProfileModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Fontisto name="close" size={14} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Nama Lengkap</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nama Lengkap"
              placeholderTextColor="#9ca3af"
              value={editFullName}
              onChangeText={setEditFullName}
            />

            <Text style={styles.modalLabel}>Tanggal Lahir (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contoh: 2002-08-17"
              placeholderTextColor="#9ca3af"
              value={editBirthDate}
              onChangeText={setEditBirthDate}
            />

            <Text style={styles.modalLabel}>Jenis Kelamin</Text>
            <View style={styles.pillRow}>
              {genders.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.modalPill,
                    editGender === g && styles.modalPillActive,
                  ]}
                  onPress={() => setEditGender(g)}
                >
                  <Text
                    style={[
                      styles.modalPillText,
                      editGender === g && styles.modalPillTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.pillRow}>
              {statuses.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.modalPill,
                    editStatus === s && styles.modalPillActive,
                  ]}
                  onPress={() => setEditStatus(s)}
                >
                  <Text
                    style={[
                      styles.modalPillText,
                      editStatus === s && styles.modalPillTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryModalSaveBtn}
              activeOpacity={0.8}
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryModalSaveBtnText}>Simpan Perubahan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  stateSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 10,
  },
  unauthCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  unauthIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  unauthTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  unauthSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: "#6400de",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  profileHeaderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrapper: {
    position: "relative",
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6400de",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },
  statusPill: {
    backgroundColor: "#ede9fe",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6400de",
  },
  changeAvatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  changeAvatarBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6400de",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionTitleAlone: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  editActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6400de",
  },
  infoBoxContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  infoBoxItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  infoBoxItemLast: {
    borderBottomWidth: 0,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContentCol: {
    flex: 1,
  },
  infoFieldLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
  },
  infoFieldValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#fee2e2",
    borderRadius: 16,
    height: 48,
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#dc2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: "90%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  avatarPreviewCenter: {
    alignItems: "center",
    marginVertical: 12,
  },
  modalAvatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  modalAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 6,
  },
  presetGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  presetCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  presetCircleBtnActive: {
    borderColor: "#6400de",
  },
  presetGridImage: {
    width: "100%",
    height: "100%",
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  modalPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalPillActive: {
    backgroundColor: "#ede9fe",
    borderColor: "#6400de",
  },
  modalPillText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
  },
  modalPillTextActive: {
    color: "#6400de",
    fontWeight: "700",
  },
  removeAvatarTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 10,
    alignSelf: "flex-start",
  },
  removeAvatarText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
  },
  primaryModalSaveBtn: {
    backgroundColor: "#6400de",
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryModalSaveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
