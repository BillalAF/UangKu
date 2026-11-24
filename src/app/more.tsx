import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Fontisto from "@expo/vector-icons/Fontisto";
import {
  Transaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  subscribeFinanceUpdates,
  formatRupiah,
} from "../services/financeService";
import { toDateString } from "../lib/date";

interface DayGroup {
  dateStr: string;
  dayLabel: string;
  dayTotalExpense: number;
  dayTotalIncome: number;
  transactions: Transaction[];
}

interface WeekGroup {
  weekKey: string;
  weekLabel: string;
  isCurrentWeek: boolean;
  mondayTime: number;
  totalExpense: number;
  totalIncome: number;
  days: DayGroup[];
}

export default function MoreScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");

  const loadData = useCallback(async () => {
    try {
      const txList = await getTransactions();
      setTransactions(txList);
    } catch (err) {
      console.error("Gagal memuat riwayat transaksi:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeFinanceUpdates(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Helper untuk menentukan minggu dari tanggal YYYY-MM-DD
  const getWeekInfo = useCallback((dateStr: string, today: Date) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const txDate = new Date(y, m - 1, d);

    // Senin pada minggu transaksi
    const txDay = txDate.getDay();
    const diffToMonday = txDate.getDate() - txDay + (txDay === 0 ? -6 : 1);
    const monday = new Date(y, m - 1, diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Senin pada minggu ini
    const todayDay = today.getDay();
    const todayDiffMonday = today.getDate() - todayDay + (todayDay === 0 ? -6 : 1);
    const currentMonday = new Date(today.getFullYear(), today.getMonth(), todayDiffMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffWeeks = Math.round((currentMonday.getTime() - monday.getTime()) / msPerWeek);

    let weekTitle = "";
    if (diffWeeks === 0) {
      weekTitle = "Minggu Ini";
    } else if (diffWeeks === 1) {
      weekTitle = "Minggu Lalu";
    } else if (diffWeeks > 1) {
      weekTitle = `${diffWeeks} Minggu Lalu`;
    } else {
      weekTitle = "Minggu Mendatang";
    }

    const startFmt = monday.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const endFmt = sunday.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const weekLabel = `${weekTitle} (${startFmt} - ${endFmt})`;
    const weekKey = toDateString(monday);

    return {
      weekKey,
      weekLabel,
      isCurrentWeek: diffWeeks === 0,
      mondayTime: monday.getTime(),
    };
  }, []);

  // Helper untuk format label hari
  const formatDayLabel = useCallback((dateStr: string, todayStr: string): string => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (dateStr === todayStr) {
      return `Hari Ini, ${dayName}`;
    }
    return dayName;
  }, []);

  // Pengelompokan: MINGGU -> HARI -> KARTU (Hingga 2 Bulan Terakhir)
  const groupedData: WeekGroup[] = useMemo(() => {
    const now = new Date();
    const todayStr = toDateString(now);

    // Batas 2 bulan terakhir (60 hari ke belakang)
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
    twoMonthsAgo.setHours(0, 0, 0, 0);
    const cutoffStr = toDateString(twoMonthsAgo);

    // 1. Filter rentang waktu dan tipe
    const filtered = transactions.filter((t) => {
      const matchCutoff = t.date >= cutoffStr;
      const matchType = filterType === "all" ? true : t.type === filterType;
      return matchCutoff && matchType;
    });

    // 2. Map pengelompokan minggu
    const weekMap = new Map<string, {
      weekKey: string;
      weekLabel: string;
      isCurrentWeek: boolean;
      mondayTime: number;
      totalExpense: number;
      totalIncome: number;
      dayMap: Map<string, {
        dateStr: string;
        dayLabel: string;
        dayTotalExpense: number;
        dayTotalIncome: number;
        transactions: Transaction[];
      }>;
    }>();

    for (const tx of filtered) {
      const weekInfo = getWeekInfo(tx.date, now);

      if (!weekMap.has(weekInfo.weekKey)) {
        weekMap.set(weekInfo.weekKey, {
          weekKey: weekInfo.weekKey,
          weekLabel: weekInfo.weekLabel,
          isCurrentWeek: weekInfo.isCurrentWeek,
          mondayTime: weekInfo.mondayTime,
          totalExpense: 0,
          totalIncome: 0,
          dayMap: new Map(),
        });
      }

      const weekEntry = weekMap.get(weekInfo.weekKey)!;
      if (tx.type === "expense") {
        weekEntry.totalExpense += tx.amount;
      } else {
        weekEntry.totalIncome += tx.amount;
      }

      // Group hari di dalam minggu tersebut
      if (!weekEntry.dayMap.has(tx.date)) {
        weekEntry.dayMap.set(tx.date, {
          dateStr: tx.date,
          dayLabel: formatDayLabel(tx.date, todayStr),
          dayTotalExpense: 0,
          dayTotalIncome: 0,
          transactions: [],
        });
      }

      const dayEntry = weekEntry.dayMap.get(tx.date)!;
      if (tx.type === "expense") {
        dayEntry.dayTotalExpense += tx.amount;
      } else {
        dayEntry.dayTotalIncome += tx.amount;
      }
      dayEntry.transactions.push(tx);
    }

    // 3. Konversi ke array dan urutkan:
    // MINGGU: Paling atas adalah Minggu Ini (mondayTime desc)
    const sortedWeeks: WeekGroup[] = Array.from(weekMap.values())
      .sort((a, b) => b.mondayTime - a.mondayTime)
      .map((w) => {
        // HARI: Paling atas adalah hari terbaru (dateStr desc)
        const sortedDays: DayGroup[] = Array.from(w.dayMap.values())
          .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
          .map((d) => ({
            ...d,
            // KARTU: Urutkan transaksi di dalam hari
            transactions: d.transactions.sort((a, b) => {
              if (b.created_at && a.created_at) {
                return b.created_at.localeCompare(a.created_at);
              }
              return b.id.localeCompare(a.id);
            }),
          }));

        return {
          weekKey: w.weekKey,
          weekLabel: w.weekLabel,
          isCurrentWeek: w.isCurrentWeek,
          mondayTime: w.mondayTime,
          totalExpense: w.totalExpense,
          totalIncome: w.totalIncome,
          days: sortedDays,
        };
      });

    return sortedWeeks;
  }, [transactions, filterType, getWeekInfo, formatDayLabel]);

  // Statistik 2 bulan terakhir
  const periodStats = useMemo(() => {
    let exp = 0;
    let inc = 0;
    let count = 0;
    for (const w of groupedData) {
      exp += w.totalExpense;
      inc += w.totalIncome;
      for (const d of w.days) {
        count += d.transactions.length;
      }
    }
    return { expense: exp, income: inc, count };
  }, [groupedData]);

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

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
      {/* ====================================================================
          1. HEADER ATAS DENGAN TOMBOL KEMBALI
          ==================================================================== */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Fontisto name="arrow-left" size={16} color="#6400de" />
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>

        <View style={styles.topBarTitleCol}>
          <Text style={styles.topBarTitle}>Riwayat Transaksi</Text>
          <Text style={styles.topBarSubtitle}>2 Bulan Terakhir</Text>
        </View>

        <View style={styles.topBarRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ====================================================================
            2. STATISTIK RINGKAS 2 BULAN TERAKHIR
            ==================================================================== */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Pengeluaran</Text>
            <Text style={styles.summaryAmountExpense}>
              -{formatRupiah(periodStats.expense)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Pemasukan</Text>
            <Text style={styles.summaryAmountIncome}>
              +{formatRupiah(periodStats.income)}
            </Text>
          </View>
        </View>

        {/* ====================================================================
            3. FILTER TIPE (SEMUA / PENGELUARAN / PEMASUKAN)
            ==================================================================== */}
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
            4. TAMPILAN BERSTRUKTUR: MINGGU -> HARI -> KARTU
            ==================================================================== */}
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#6400de" />
            <Text style={styles.stateSubtitle}>Memuat riwayat transaksi...</Text>
          </View>
        ) : groupedData.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Fontisto name="history" size={24} color="#9ca3af" />
            </View>
            <Text style={styles.emptyTitle}>Belum Ada Riwayat Transaksi</Text>
            <Text style={styles.emptySubtitle}>
              Tidak ada catatan transaksi dalam rentang 2 bulan terakhir untuk filter yang dipilih.
            </Text>
          </View>
        ) : (
          groupedData.map((week) => (
            <View key={week.weekKey} style={styles.weekSection}>
              {/* LEVEL 1: MINGGU */}
              <View
                style={[
                  styles.weekHeader,
                  week.isCurrentWeek && styles.weekHeaderCurrent,
                ]}
              >
                <View style={styles.weekTitleRow}>
                  <Fontisto
                    name="calendar"
                    size={14}
                    color={week.isCurrentWeek ? "#ffffff" : "#6400de"}
                  />
                  <Text
                    style={[
                      styles.weekTitleText,
                      week.isCurrentWeek && styles.weekTitleTextCurrent,
                    ]}
                  >
                    {week.weekLabel}
                  </Text>
                </View>

                {week.totalExpense > 0 && (
                  <Text
                    style={[
                      styles.weekTotalText,
                      week.isCurrentWeek && styles.weekTotalTextCurrent,
                    ]}
                  >
                    -{formatRupiah(week.totalExpense)}
                  </Text>
                )}
              </View>

              {/* LEVEL 2: HARI */}
              {week.days.map((day) => (
                <View key={day.dateStr} style={styles.daySection}>
                  <View style={styles.dayHeaderRow}>
                    <View style={styles.dayDot} />
                    <Text style={styles.dayTitleText}>{day.dayLabel}</Text>
                    <View style={styles.dayTotalRight}>
                      {day.dayTotalExpense > 0 && (
                        <Text style={styles.dayExpenseSubtotal}>
                          -{formatRupiah(day.dayTotalExpense)}
                        </Text>
                      )}
                      {day.dayTotalIncome > 0 && (
                        <Text style={styles.dayIncomeSubtotal}>
                          +{formatRupiah(day.dayTotalIncome)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* LEVEL 3: KARTU TRANSAKSI */}
                  <View style={styles.cardsCol}>
                    {day.transactions.map((tx) => {
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
                              isIncome
                                ? styles.iconCircleIncome
                                : styles.iconCircleExpense,
                            ]}
                          >
                            <Fontisto
                              name={getCategoryIcon(tx.category)}
                              size={15}
                              color={isIncome ? "#16a34a" : "#dc2626"}
                            />
                          </View>

                          <View style={styles.txInfoCol}>
                            <Text style={styles.txTitle} numberOfLines={1}>
                              {tx.title}
                            </Text>
                            <Text style={styles.txMetaText}>
                              {tx.category} • {tx.wallet}
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
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6400de",
  },
  topBarTitleCol: {
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  topBarSubtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 1,
  },
  topBarRightSpacer: {
    width: 60,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryAmountExpense: {
    fontSize: 15,
    fontWeight: "700",
    color: "#dc2626",
  },
  summaryAmountIncome: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16a34a",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
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
    paddingVertical: 40,
  },
  stateSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 12,
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
    paddingHorizontal: 12,
  },
  weekSection: {
    marginBottom: 20,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ede9fe",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  weekHeaderCurrent: {
    backgroundColor: "#6400de",
  },
  weekTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  weekTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6400de",
  },
  weekTitleTextCurrent: {
    color: "#ffffff",
  },
  weekTotalText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
    marginLeft: 8,
  },
  weekTotalTextCurrent: {
    color: "#fed7aa",
  },
  daySection: {
    marginBottom: 12,
    paddingLeft: 6,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9ca3af",
    marginRight: 8,
  },
  dayTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
    flex: 1,
  },
  dayTotalRight: {
    flexDirection: "row",
    gap: 8,
  },
  dayExpenseSubtotal: {
    fontSize: 11,
    fontWeight: "600",
    color: "#dc2626",
  },
  dayIncomeSubtotal: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },
  cardsCol: {
    gap: 6,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
