import Fontisto from "@expo/vector-icons/Fontisto";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
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
} from "../services/financeService";

function getCategoryIcon(category: string): React.ComponentProps<typeof Fontisto>["name"] {
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
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) {
      setTransaction(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getTransactionById(id);
      setTransaction(data);
    } catch (e) {
      console.warn("Failed to load transaction detail:", e);
      setError("Gagal memuat detail transaksi. Periksa koneksi Anda lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeFinanceUpdates(() => {
      loadData();
    });
    return unsubscribe;
  }, [loadData]);

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
      "Hapus Transaksi",
      `Yakin ingin menghapus "${transaction.title}"? Tindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              router.back();
            } catch {
              Alert.alert("Gagal", "Transaksi tidak dapat dihapus. Silakan coba lagi.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <ActivityIndicator size="small" color="#6400de" />
        <Text style={styles.stateText}>Memuat detail transaksi...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <Text style={styles.stateTitle}>Gagal Memuat</Text>
        <Text style={styles.stateSubtitle}>{error}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          onPress={() => {
            setLoading(true);
            loadData();
          }}
        >
          <Text style={styles.primaryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <Text style={styles.stateTitle}>Transaksi Tidak Ditemukan</Text>
        <Text style={styles.stateSubtitle}>
          Data transaksi mungkin sudah dihapus atau tidak tersedia lagi.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          <Text style={styles.primaryButtonText}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isIncome = transaction.type === "income";
  const recordedTime = transaction.created_at
    ? new Date(transaction.created_at).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.back()}
        >
          <Fontisto name="arrow-left" size={16} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Transaksi</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Focal Amount Summary */}
        <View style={styles.summaryBlock}>
          <View style={styles.iconBox}>
            <Fontisto
              name={getCategoryIcon(transaction.category)}
              size={20}
              color="#374151"
            />
          </View>

          <Text style={styles.typeLabel}>
            {isIncome ? "Pemasukan" : "Pengeluaran"}
          </Text>

          <Text
            style={[
              styles.amountText,
              isIncome ? styles.amountIncome : styles.amountExpense,
            ]}
          >
            {isIncome ? "+" : "-"}
            {formatRupiah(transaction.amount)}
          </Text>

          <Text style={styles.titleText}>{transaction.title}</Text>
        </View>

        {/* Minimal Detail List */}
        <View style={styles.detailList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Kategori</Text>
            <Text style={styles.detailValue}>{transaction.category}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dompet</Text>
            <Text style={styles.detailValue}>{transaction.wallet}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tanggal</Text>
            <Text style={styles.detailValue}>{transaction.date}</Text>
          </View>

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailLabel}>Waktu Dicatat</Text>
            <Text style={styles.detailValue}>{recordedTime}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          accessibilityRole="button"
          onPress={handleOpenEdit}
        >
          <Text style={styles.primaryButtonText}>Ubah Transaksi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Hapus Transaksi</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  stateContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: "#4b5563",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  stateSubtitle: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  summaryBlock: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 6,
  },
  amountText: {
    fontSize: 34,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  amountIncome: {
    color: "#15803d",
  },
  amountExpense: {
    color: "#b91c1c",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
  },
  detailList: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 16,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#6400de",
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  deleteButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#b91c1c",
  },
});
