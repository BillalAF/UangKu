import Fontisto from "@expo/vector-icons/Fontisto";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  deleteTransaction,
  formatRupiah,
  getTransactionById,
  subscribeFinanceUpdates,
  Transaction,
  TransactionType,
  updateTransaction,
} from "../services/financeService";

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

function getCategoryIcon(category: string): any {
  switch (category?.toLowerCase()) {
    case "makanan":
      return "coffeescript";
    case "transportasi":
      return "car";
    case "belanja":
      return "shopping-bag";
    case "hiburan":
      return "film";
    case "tagihan":
      return "wallet";
    case "gaji":
      return "money-symbol";
    case "investasi":
      return "line-chart";
    default:
      return "nav-icon-grid";
  }
}

export default function DetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const data = await getTransactionById(id);
      setTransaction(data);
    } catch (e) {
      console.warn("Failed to load transaction detail:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeFinanceUpdates(() => {
      loadData();
    });
    return unsubscribe;
  }, [id]);

  const handleOpenEdit = () => {
    if (!transaction) return;
    router.push({
      pathname: "/edit" as any,
      params: { id: transaction.id },
    });
  };

  const handleDelete = () => {
    if (!transaction) return;
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus transaksi "${transaction.title}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              Alert.alert("Berhasil", "Transaksi telah dihapus.", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            } catch (e) {
              Alert.alert("Error", "Gagal menghapus transaksi.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.containerCenter}>
        <ActivityIndicator size="large" color="#6400de" />
        <Text style={styles.loadingText}>Memuat detail transaksi...</Text>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.containerCenter}>
        <Fontisto name="close" size={42} color="#dc2626" />
        <Text style={styles.notFoundTitle}>Transaksi Tidak Ditemukan</Text>
        <Text style={styles.notFoundSubtitle}>
          Data transaksi mungkin telah dihapus atau ID tidak valid.
        </Text>
        <TouchableOpacity
          style={styles.backButtonLarge}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonLargeText}>Kembali ke Riwayat</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isIncome = transaction.type === "income";

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
        <Text style={styles.headerBarTitle}>Detail Transaksi</Text>
        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.7}
          onPress={handleOpenEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Fontisto name="equalizer" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* KARTU UTAMA NOMINAL & ICON */}
        <View style={styles.mainAmountCard}>
          <View
            style={[
              styles.amountIconCircle,
              isIncome ? styles.bgIncome : styles.bgExpense,
            ]}
          >
            <Fontisto
              name={getCategoryIcon(transaction.category)}
              size={28}
              color="#ffffff"
            />
          </View>

          <View style={styles.typeBadgeRow}>
            <View
              style={[
                styles.typeBadge,
                isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense,
              ]}
            >
              <Fontisto
                name={isIncome ? "angle-up" : "angle-down"}
                size={11}
                color={isIncome ? "#16a34a" : "#dc2626"}
              />
              <Text
                style={[
                  styles.typeBadgeText,
                  isIncome ? styles.textIncome : styles.textExpense,
                ]}
              >
                {isIncome ? "Pemasukan" : "Pengeluaran"}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.mainAmountNumber,
              isIncome ? styles.textIncome : styles.textExpense,
            ]}
          >
            {isIncome ? "+" : "-"}
            {formatRupiah(transaction.amount)}
          </Text>

          <Text style={styles.mainTitle}>{transaction.title}</Text>
        </View>

        {/* SECTION DETAIL SPESIFIKASI */}
        <Text style={styles.sectionHeader}>Informasi Lengkap</Text>
        <View style={styles.detailsCard}>
          {/* Baris 1: Kategori */}
          <View style={styles.detailRow}>
            <View style={styles.rowLabelCol}>
              <Fontisto name="nav-icon-grid" size={14} color="#6400de" />
              <Text style={styles.rowLabel}>Kategori</Text>
            </View>
            <Text style={styles.rowValue}>{transaction.category}</Text>
          </View>

          {/* Baris 2: Dompet / Rekening */}
          <View style={styles.detailRow}>
            <View style={styles.rowLabelCol}>
              <Fontisto name="wallet" size={14} color="#6400de" />
              <Text style={styles.rowLabel}>Sumber Dana / Dompet</Text>
            </View>
            <Text style={styles.rowValue}>{transaction.wallet}</Text>
          </View>

          {/* Baris 3: Tanggal Transaksi */}
          <View style={styles.detailRow}>
            <View style={styles.rowLabelCol}>
              <Fontisto name="date" size={14} color="#6400de" />
              <Text style={styles.rowLabel}>Tanggal</Text>
            </View>
            <Text style={styles.rowValue}>{transaction.date}</Text>
          </View>

          {/* Baris 4: Waktu Pencatatan */}
          <View style={styles.detailRow}>
            <View style={styles.rowLabelCol}>
              <Fontisto name="clock" size={14} color="#6400de" />
              <Text style={styles.rowLabel}>Waktu Dicatat</Text>
            </View>
            <Text style={styles.rowValue}>
              {transaction.created_at
                ? new Date(transaction.created_at).toLocaleString("id-ID")
                : "Tercatat di UangKu"}
            </Text>
          </View>

          {/* Baris 5: ID Transaksi */}
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <View style={styles.rowLabelCol}>
              <Fontisto name="key" size={14} color="#6400de" />
              <Text style={styles.rowLabel}>ID Transaksi</Text>
            </View>
            <Text style={styles.rowValueSmall} numberOfLines={1}>
              {transaction.id}
            </Text>
          </View>
        </View>

        {/* SECTION INTEGRASI BACKEND */}
        <Text style={styles.sectionHeader}>Sinkronisasi Web Service</Text>
        <View style={styles.syncCard}>
          <View style={styles.syncCardIcon}>
            <Fontisto name="cloud-refresh" size={18} color="#16a34a" />
          </View>
          <View style={styles.syncCardTextCol}>
            <Text style={styles.syncCardTitle}>RESTful API Modul 1 PPB</Text>
            <Text style={styles.syncCardSubtitle}>
              Endpoint: /api/transactions/:id terhubung dengan server Express.js & database Supabase.
            </Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtonGroup}>
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.8}
            onPress={handleOpenEdit}
          >
            <Fontisto name="equalizer" size={14} color="#6400de" />
            <Text style={styles.editBtnText}>Ubah Transaksi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            activeOpacity={0.8}
            onPress={handleDelete}
          >
            <Fontisto name="trash" size={14} color="#dc2626" />
            <Text style={styles.deleteBtnText}>Hapus Transaksi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mainAmountCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  amountIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  bgIncome: {
    backgroundColor: "#16a34a",
  },
  bgExpense: {
    backgroundColor: "#dc2626",
  },
  typeBadgeRow: {
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeIncome: {
    backgroundColor: "#dcfce7",
  },
  typeBadgeExpense: {
    backgroundColor: "#fee2e2",
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  mainAmountNumber: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },
  textIncome: {
    color: "#16a34a",
  },
  textExpense: {
    color: "#dc2626",
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  detailsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  rowLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  rowValueSmall: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    maxWidth: 160,
  },
  syncCard: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  syncCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  syncCardTextCol: {
    flex: 1,
  },
  syncCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  syncCardSubtitle: {
    fontSize: 11,
    color: "#15803d",
    lineHeight: 16,
  },
  actionButtonGroup: {
    gap: 12,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede9fe",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6400de",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#dc2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  typeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  typeTabExpenseActive: {
    backgroundColor: "#dc2626",
  },
  typeTabIncomeActive: {
    backgroundColor: "#16a34a",
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  typeTabTextActive: {
    color: "#ffffff",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  pillsScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  pillItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  pillItemActive: {
    backgroundColor: "#6400de",
  },
  pillText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
  },
  pillTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#6400de",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
