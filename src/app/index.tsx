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
  ActivityIndicator,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Fontisto from "@expo/vector-icons/Fontisto";
import {
  Transaction,
  SmartBudgetCalculation,
  getTransactions,
  calculateSmartBudget,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  subscribeFinanceUpdates,
  formatRupiah,
} from "../services/financeService";
import {
  getCurrentUser,
  subscribeAuthUpdates,
  UserProfile,
} from "../services/authService";
import { todayStr } from "../lib/date";

const ITEMS_PER_PAGE = 5;

export default function HomeScreen() {
  const router = useRouter();

  // State Prediksi & Anggaran Cerdas
  const [smartBudget, setSmartBudget] = useState<SmartBudgetCalculation>({
    monthlyIncome: 0,
    allocation: { needs: 50, wants: 30, savings: 20 },
    allocationLabel: "50-30-20",
    needsBudget: 0,
    wantsBudget: 0,
    savingsBudget: 0,
    monthlySpendable: 0,
    monthlyExpense: 0,
    remainingSpendableMonth: 0,
    todayAllowance: 0,
    todayExpense: 0,
    todayIncome: 0,
    todayAvailable: 0,
    daysRemainingInMonth: 1,
    totalDaysInMonth: 30,
    currentDay: 1,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSavings, setShowSavings] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // State Modal Form (Tambah & Edit)
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCategory, setFormCategory] = useState<string>("Makanan");
  const [formWallet, setFormWallet] = useState<string>("Tunai");

  const categories = [
    "Makanan",
    "Transportasi",
    "Belanja",
    "Tagihan",
    "Gaji",
    "Lainnya",
  ];
  const wallets = ["Tunai", "BCA", "Mandiri", "GoPay", "OVO"];

  // Memuat data dari financeService dan authService
  const loadData = useCallback(async () => {
    try {
      const [budgetCalc, txList, currentUser] = await Promise.all([
        calculateSmartBudget(),
        getTransactions(),
        getCurrentUser(),
      ]);
      setSmartBudget(budgetCalc);
      setTransactions(txList);
      setUser(currentUser);
    } catch (err) {
      console.error("Gagal memuat data keuangan:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribeFinance = subscribeFinanceUpdates(() => {
      loadData();
    });
    const unsubscribeAuth = subscribeAuthUpdates((updatedUser) => {
      setUser(updatedUser);
    });
    return () => {
      unsubscribeFinance();
      unsubscribeAuth();
    };
  }, [loadData]);

  // Reset pagination jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  // Buka modal untuk menambah transaksi baru
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormTitle("");
    setFormAmount("");
    setFormType("expense");
    setFormCategory("Makanan");
    setFormWallet("Tunai");
    setModalVisible(true);
  };

  // Simpan data transaksi baru
  const handleSaveTransaction = async () => {
    const cleanTitle = formTitle.trim();
    const cleanAmount = parseInt(formAmount.replace(/\D/g, ""), 10);

    if (!cleanTitle) {
      Alert.alert("Perhatian", "Silakan masukkan judul atau catatan transaksi.");
      return;
    }
    if (!cleanAmount || cleanAmount <= 0) {
      Alert.alert("Perhatian", "Silakan masukkan nominal angka yang valid.");
      return;
    }

    try {
      if (editingId) {
        await updateTransaction(editingId, {
          title: cleanTitle,
          amount: cleanAmount,
          type: formType,
          category: formCategory,
          wallet: formWallet,
        });
      } else {
        await addTransaction({
          title: cleanTitle,
          amount: cleanAmount,
          type: formType,
          category: formCategory,
          wallet: formWallet,
          date: todayStr(),
        });
      }
      setModalVisible(false);
      await loadData();
    } catch (err) {
      Alert.alert("Gagal Menyimpan", "Terjadi kendala saat menyimpan transaksi.");
    }
  };

  // Hapus transaksi
  const handleDeleteTransaction = () => {
    if (!editingId) return;

    Alert.alert(
      "Konfirmasi Hapus",
      "Apakah Anda yakin ingin menghapus transaksi ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(editingId);
              setModalVisible(false);
              await loadData();
            } catch (e) {
              Alert.alert("Error", "Gagal menghapus transaksi.");
            }
          },
        },
      ]
    );
  };

  const handleOpenSelengkapnya = () => {
    router.push("/more" as any);
  };

  // Filter daftar transaksi: HANYA HARI INI untuk dashboard utama
  const todayDateStr = todayStr();
  const todayTransactions = transactions.filter((t) => t.date === todayDateStr);

  const filteredTransactions = todayTransactions.filter((t) => {
    if (filterType === "all") return true;
    return t.type === filterType;
  });

  // Paginasi: maksimal 5 item per halaman
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "makanan":
        return "shopping-bag";
      case "transportasi":
        return "car";
      case "gaji":
        return "wallet";
      case "tagihan":
        return "credit-card";
      case "belanja":
        return "dollar";
      default:
        return "dollar";
    }
  };

  const todayFormattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ====================================================================
            1. HEADER SALAM, TANGGAL & FOTO PROFIL (POJOK KANAN)
            ==================================================================== */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.greetingTitle} numberOfLines={1}>
              {user?.fullName ? `Halo, ${user.fullName}` : "Halo, Pengguna UangKu"}
            </Text>
            <Text style={styles.dateSubtitle}>{todayFormattedDate}</Text>
          </View>

          {/* Avatar di Pojok Kanan Atas */}
          <TouchableOpacity
            style={styles.headerAvatarBtn}
            activeOpacity={0.8}
            onPress={() => router.push((user ? "/profile" : "/login") as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {user?.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={styles.headerAvatarImage}
              />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Fontisto name="person" size={16} color="#6400de" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ====================================================================
            2. HERO CARD (PREDIKSI KEUANGAN DENGAN 3 ELEMEN UTAMA)
            ==================================================================== */}
        <View style={styles.heroCard}>
          {/* Elemen 1: Uang yang bisa kamu gunakan hari ini */}
          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>Uang Yang bisa kamu gunakan hari ini</Text>
            <Text
              style={[
                styles.heroAmountBig,
                smartBudget.todayAvailable < 0 && styles.heroAmountNegative,
              ]}
            >
              {formatRupiah(smartBudget.todayAvailable)}
            </Text>
          </View>

          {/* Elemen 2: Uang kamu bulan ini */}
          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>Uang kamu bulan ini</Text>
            <Text
              style={[
                styles.heroAmountMedium,
                smartBudget.remainingSpendableMonth < 0 && styles.heroAmountNegative,
              ]}
            >
              {formatRupiah(smartBudget.remainingSpendableMonth)}
            </Text>
          </View>

          {/* Elemen 3: Tabungan terkumpul + Tombol Mata */}
          <View style={styles.heroSectionBottom}>
            <View style={styles.savingsHeaderRow}>
              <Text style={styles.heroLabel}>Tabungan terkumpul</Text>
              <TouchableOpacity
                onPress={() => setShowSavings(!showSavings)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Fontisto
                  name="eye"
                  size={15}
                  color={showSavings ? "#ffffff" : "rgba(255, 255, 255, 0.6)"}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.heroAmountSmall}>
              {showSavings ? formatRupiah(smartBudget.savingsBudget) : "Rp ••••••"}
            </Text>
          </View>

          {/* Notifikasi jika gaji/alokasi belum diatur */}
          {smartBudget.monthlyIncome === 0 && (
            <TouchableOpacity
              style={styles.setupBanner}
              activeOpacity={0.8}
              onPress={() => router.push("/ask")}
            >
              <Fontisto name="flash" size={12} color="#ffffff" />
              <Text style={styles.setupBannerText}>
                Atur alokasi anggaran dan gaji di Tanya AI
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ====================================================================
            3. QUICK ACTION BAR (CATAT TRANSAKSI & TANYA AI)
            ==================================================================== */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            activeOpacity={0.8}
            onPress={handleOpenAdd}
          >
            <Fontisto name="plus-a" size={14} color="#ffffff" />
            <Text style={styles.primaryActionText}>Catat Transaksi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            activeOpacity={0.8}
            onPress={() => router.push("/ask")}
          >
            <Fontisto name="commenting" size={14} color="#6400de" />
            <Text style={styles.secondaryActionText}>Tanya AI</Text>
          </TouchableOpacity>
        </View>

        {/* ====================================================================
            4. RIWAYAT TRANSAKSI DENGAN PAGINASI (5 PER KOLOM/HALAMAN)
            ==================================================================== */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Riwayat Transaksi</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenSelengkapnya}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.selengkapnyaText}>selengkapnya</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterPill,
              filterType === "all" && styles.filterPillActive,
            ]}
            onPress={() => setFilterType("all")}
          >
            <Text
              style={[
                styles.filterPillText,
                filterType === "all" && styles.filterPillTextActive,
              ]}
            >
              Semua
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterPill,
              filterType === "expense" && styles.filterPillActive,
            ]}
            onPress={() => setFilterType("expense")}
          >
            <Text
              style={[
                styles.filterPillText,
                filterType === "expense" && styles.filterPillTextActive,
              ]}
            >
              Pengeluaran
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterPill,
              filterType === "income" && styles.filterPillActive,
            ]}
            onPress={() => setFilterType("income")}
          >
            <Text
              style={[
                styles.filterPillText,
                filterType === "income" && styles.filterPillTextActive,
              ]}
            >
              Pemasukan
            </Text>
          </Pressable>
        </View>

        {/* ====================================================================
            5. TAMPILAN KONDISI (LOADING, EMPTY STATE, POPULATED DATA)
            ==================================================================== */}
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#6400de" />
            <Text style={styles.stateSubtitle}>Memuat catatan keuangan...</Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          /* Empty State sesuai foto */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Fontisto name="wallet" size={24} color="#9ca3af" />
            </View>
            <Text style={styles.emptyTitle}>Belum Ada Transaksi Hari Ini</Text>
            <Text style={styles.emptySubtitle}>
              Ketik pengeluaran di tab Chat Bot AI atau klik tombol di bawah untuk mencatat transaksi hari ini.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              activeOpacity={0.8}
              onPress={handleOpenAdd}
            >
              <Text style={styles.emptyActionText}>Catat Transaksi Pertama</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Daftar Transaksi dengan Maksimal 5 Item */
          <View style={styles.transactionsContainer}>
            {paginatedTransactions.map((tx) => {
              const isIncome = tx.type === "income";
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txCard}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/detail" as any,
                      params: { id: tx.id },
                    })
                  }
                >
                  <View
                    style={[
                      styles.txIconCircle,
                      isIncome ? styles.iconCircleIncome : styles.iconCircleExpense,
                    ]}
                  >
                    <Fontisto
                      name={getCategoryIcon(tx.category)}
                      size={16}
                      color={isIncome ? "#16a34a" : "#dc2626"}
                    />
                  </View>

                  <View style={styles.txInfoCol}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {tx.title}
                    </Text>
                    <Text style={styles.txMetaText}>
                      {tx.category} • {tx.wallet} • {tx.date}
                    </Text>
                  </View>

                  <View style={styles.txAmountCol}>
                    <Text
                      style={[
                        styles.txAmountText,
                        isIncome ? styles.textIncome : styles.textExpense,
                      ]}
                    >
                      {isIncome ? "+" : "-"}
                      {formatRupiah(tx.amount)}
                    </Text>
                    <Text style={styles.tapToEditText}>Lihat detail</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Navigasi Paginasi 5 Transaksi Per Halaman */}
            {totalPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[
                    styles.pageNavButton,
                    currentPage === 1 && styles.pageNavButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <Fontisto
                    name="angle-left"
                    size={11}
                    color={currentPage === 1 ? "#9ca3af" : "#6400de"}
                  />
                  <Text
                    style={[
                      styles.pageNavText,
                      currentPage === 1 && styles.pageNavTextDisabled,
                    ]}
                  >
                    Sebelumnya
                  </Text>
                </TouchableOpacity>

                <Text style={styles.pageIndicatorText}>
                  Halaman {currentPage} dari {totalPages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pageNavButton,
                    currentPage === totalPages && styles.pageNavButtonDisabled,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text
                    style={[
                      styles.pageNavText,
                      currentPage === totalPages && styles.pageNavTextDisabled,
                    ]}
                  >
                    Berikutnya
                  </Text>
                  <Fontisto
                    name="angle-right"
                    size={11}
                    color={currentPage === totalPages ? "#9ca3af" : "#6400de"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ====================================================================
          6. MODAL FORM TRANSAKSI (TAMBAH & EDIT MANUAL)
          ==================================================================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edit Transaksi" : "Tambah Transaksi"}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Fontisto name="close" size={14} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Pilihan Tipe Transaksi */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  formType === "expense" && styles.typeTabExpenseActive,
                ]}
                onPress={() => setFormType("expense")}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    formType === "expense" && styles.typeTabTextActive,
                  ]}
                >
                  Pengeluaran
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  formType === "income" && styles.typeTabIncomeActive,
                ]}
                onPress={() => setFormType("income")}
              >
                <Text
                  style={[
                    styles.typeTabText,
                    formType === "income" && styles.typeTabTextActive,
                  ]}
                >
                  Pemasukan
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Judul */}
            <Text style={styles.inputLabel}>Catatan / Judul</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Contoh: Makan Siang, Bensin, Gaji"
              placeholderTextColor="#9ca3af"
              value={formTitle}
              onChangeText={setFormTitle}
            />

            {/* Input Nominal */}
            <Text style={styles.inputLabel}>Nominal (Rp)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={formAmount}
              onChangeText={setFormAmount}
            />

            {/* Pilihan Kategori */}
            <Text style={styles.inputLabel}>Kategori</Text>
            <View style={styles.optionPillGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.optionPill,
                    formCategory === cat && styles.optionPillActive,
                  ]}
                  onPress={() => setFormCategory(cat)}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      formCategory === cat && styles.optionPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pilihan Dompet */}
            <Text style={styles.inputLabel}>Metode / Dompet</Text>
            <View style={styles.optionPillGrid}>
              {wallets.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[
                    styles.optionPill,
                    formWallet === w && styles.optionPillActive,
                  ]}
                  onPress={() => setFormWallet(w)}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      formWallet === w && styles.optionPillTextActive,
                    ]}
                  >
                    {w}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tombol Aksi Simpan & Hapus */}
            <View style={styles.modalActionRow}>
              {editingId && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteTransaction}
                >
                  <Fontisto name="trash" size={14} color="#dc2626" />
                  <Text style={styles.deleteButtonText}>Hapus</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.saveButton, !editingId && styles.flexOne]}
                onPress={handleSaveTransaction}
              >
                <Text style={styles.saveButtonText}>
                  {editingId ? "Perbarui" : "Simpan Transaksi"}
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 12,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  headerAvatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  headerAvatarImage: {
    width: "100%",
    height: "100%",
  },
  headerAvatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#ede9fe",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  dateSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: "#6400de",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 16,
  },
  heroSection: {
    marginBottom: 16,
  },
  heroSectionBottom: {
    marginTop: 2,
  },
  heroLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    marginBottom: 4,
  },
  heroAmountBig: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  heroAmountNegative: {
    color: "#ff6b6b",
  },
  heroAmountMedium: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  heroAmountSmall: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  savingsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyeBtn: {
    padding: 4,
  },
  setupBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
    gap: 8,
  },
  setupBannerText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  primaryActionBtn: {
    flex: 1,
    height: 48,
    backgroundColor: "#6400de",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  secondaryActionBtn: {
    flex: 1,
    height: 48,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#6400de",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6400de",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  selengkapnyaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  filterPillActive: {
    backgroundColor: "#6400de",
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
  },
  stateSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  emptyActionButton: {
    backgroundColor: "#6400de",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  transactionsContainer: {
    gap: 8,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  txIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconCircleIncome: {
    backgroundColor: "#f0fdf4",
  },
  iconCircleExpense: {
    backgroundColor: "#fef2f2",
  },
  txInfoCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  txMetaText: {
    fontSize: 11,
    color: "#6b7280",
  },
  txAmountCol: {
    alignItems: "flex-end",
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: "700",
  },
  textIncome: {
    color: "#16a34a",
  },
  textExpense: {
    color: "#dc2626",
  },
  tapToEditText: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  pageNavButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pageNavButtonDisabled: {
    opacity: 0.4,
  },
  pageNavText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6400de",
  },
  pageNavTextDisabled: {
    color: "#9ca3af",
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
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
    paddingBottom: 34,
    maxHeight: "90%",
  },
  modalHeader: {
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
  typeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
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
    color: "#4b5563",
  },
  typeTabTextActive: {
    color: "#ffffff",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 6,
  },
  formInput: {
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
  optionPillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  optionPillActive: {
    backgroundColor: "#ede9fe",
    borderColor: "#6400de",
  },
  optionPillText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
  },
  optionPillTextActive: {
    color: "#6400de",
    fontWeight: "700",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  flexOne: {
    flex: 1,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#6400de",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
