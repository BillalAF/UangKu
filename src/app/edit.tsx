import Fontisto from "@expo/vector-icons/Fontisto";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  formatRupiah,
  formatThousands,
  getTransactionById,
  parseRawAmount,
  Transaction,
  TransactionType,
  updateTransaction,
} from "../services/financeService";
import { todayStr } from "../lib/date";

const CATEGORIES = [
  "Makanan",
  "Transportasi",
  "Belanja",
  "Hiburan",
  "Tagihan",
  "Gaji",
  "Investasi",
  "Lainnya",
];

const WALLETS = ["Tunai", "BCA", "Mandiri", "GoPay", "OVO", "Bank"];

export default function EditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("Makanan");
  const [wallet, setWallet] = useState("Tunai");
  const [date, setDate] = useState("");

  useEffect(() => {
    async function loadTransaction() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const data = await getTransactionById(id);
        if (data) {
          setTransaction(data);
          setTitle(data.title);
          setAmount(formatThousands(data.amount));
          setType(data.type);
          setCategory(data.category);
          setWallet(data.wallet);
          setDate(data.date);
        }
      } catch (e) {
        console.warn("Failed to load transaction for editing:", e);
      } finally {
        setLoading(false);
      }
    }

    loadTransaction();
  }, [id]);

  const parsedAmount = parseRawAmount(amount);

  const handleSave = async () => {
    if (!transaction) return;

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert("Perhatian", "Judul transaksi tidak boleh kosong.");
      return;
    }

    if (parsedAmount <= 0) {
      Alert.alert("Perhatian", "Nominal transaksi harus lebih dari 0.");
      return;
    }

    const cleanDate = date.trim() || todayStr();

    setSaving(true);
    try {
      await updateTransaction(transaction.id, {
        title: cleanTitle,
        amount: parsedAmount,
        type,
        category,
        wallet,
        date: cleanDate,
      });

      Alert.alert("Sukses", "Data transaksi berhasil diperbarui.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Gagal memperbarui transaksi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#6400de" />
        <Text style={styles.loadingText}>Memuat formulir transaksi...</Text>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.containerCenter}>
        <Fontisto name="close" size={42} color="#dc2626" />
        <Text style={styles.notFoundTitle}>Transaksi Tidak Ditemukan</Text>
        <Text style={styles.notFoundSubtitle}>
          Data yang ingin Anda ubah tidak tersedia.
        </Text>
        <TouchableOpacity
          style={styles.backButtonLarge}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonLargeText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isIncome = type === "income";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* HEADER TOP BAR */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.7}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Fontisto name="arrow-left" size={16} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Ubah Transaksi</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SELEKTOR TIPE TRANSAKSI */}
          <Text style={styles.fieldSectionLabel}>Tipe Transaksi</Text>
          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              style={[
                styles.typeOptionTab,
                !isIncome && styles.typeOptionExpenseActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setType("expense")}
            >
              <Fontisto
                name="angle-down"
                size={12}
                color={!isIncome ? "#ffffff" : "#dc2626"}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  !isIncome && styles.typeOptionTextActive,
                ]}
              >
                Pengeluaran
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOptionTab,
                isIncome && styles.typeOptionIncomeActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setType("income")}
            >
              <Fontisto
                name="angle-up"
                size={12}
                color={isIncome ? "#ffffff" : "#16a34a"}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  isIncome && styles.typeOptionTextActive,
                ]}
              >
                Pemasukan
              </Text>
            </TouchableOpacity>
          </View>

          {/* INPUT FORM CARD */}
          <View style={styles.formCard}>
            {/* Input Judul */}
            <Text style={styles.inputLabel}>Judul Transaksi</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Contoh: Belanja Bulanan, Makan Siang"
              placeholderTextColor="#9ca3af"
            />

            {/* Input Nominal */}
            <Text style={styles.inputLabel}>Nominal (Rupiah)</Text>
            <TextInput
              style={styles.textInput}
              value={amount}
              onChangeText={(text) => setAmount(formatThousands(text))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9ca3af"
            />
            {parsedAmount > 0 && (
              <Text style={styles.amountPreviewText}>
                {formatRupiah(parsedAmount)}
              </Text>
            )}

            {/* Input Tanggal */}
            <Text style={styles.inputLabel}>Tanggal Transaksi (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={date}
              onChangeText={setDate}
              placeholder="2026-11-23"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* PILIHAN KATEGORI */}
          <Text style={styles.fieldSectionLabel}>Kategori</Text>
          <View style={styles.pillsContainer}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pillBadge, selected && styles.pillBadgeActive]}
                  activeOpacity={0.7}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.pillBadgeText,
                      selected && styles.pillBadgeTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* PILIHAN DOMPET / PEMBAYARAN */}
          <Text style={styles.fieldSectionLabel}>Dompet / Sumber Dana</Text>
          <View style={styles.pillsContainer}>
            {WALLETS.map((w) => {
              const selected = wallet === w;
              return (
                <TouchableOpacity
                  key={w}
                  style={[styles.pillBadge, selected && styles.pillBadgeActive]}
                  activeOpacity={0.7}
                  onPress={() => setWallet(w)}
                >
                  <Text
                    style={[
                      styles.pillBadgeText,
                      selected && styles.pillBadgeTextActive,
                    ]}
                  >
                    {w}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SINKRONISASI INFO */}
          <View style={styles.syncNoticeBox}>
            <Fontisto name="cloud-refresh" size={13} color="#166534" />
            <Text style={styles.syncNoticeText}>
              Perubahan otomatis disinkronkan ke server RESTful API Modul 1 & Supabase.
            </Text>
          </View>

          {/* TOMBOL AKSI */}
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Fontisto name="check" size={14} color="#ffffff" />
                <Text style={styles.submitButtonText}>Simpan Perubahan</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Batal</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  flexOne: {
    flex: 1,
  },
  containerCenter: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
  },
  notFoundSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  backButtonLarge: {
    backgroundColor: "#6400de",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonLargeText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#6400de",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
  headerRightPlaceholder: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
  },
  typeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    padding: 4,
    gap: 6,
    marginBottom: 12,
  },
  typeOptionTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  typeOptionExpenseActive: {
    backgroundColor: "#dc2626",
  },
  typeOptionIncomeActive: {
    backgroundColor: "#16a34a",
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },
  typeOptionTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  amountPreviewText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6400de",
    marginTop: 4,
    marginLeft: 4,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  pillBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  pillBadgeActive: {
    backgroundColor: "#6400de",
    borderColor: "#6400de",
  },
  pillBadgeText: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "500",
  },
  pillBadgeTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  syncNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  syncNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#166534",
    lineHeight: 16,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6400de",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginBottom: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
});
