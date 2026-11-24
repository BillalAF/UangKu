/**
 * ====================================================================================================
 * CHAT SERVICE: ASISTEN KEUANGAN AI DENGAN ALOKASI DINAMIS BEBAS (UANGKU)
 * ====================================================================================================
 * Alur:
 *  1. Aplikasi menyusun konteks keuangan terkini (jatah harian, sisa bulan, transaksi terakhir).
 *  2. Konteks + pesan dikirim ke RESTful API (POST /api/chat). Server yang memanggil Gemini,
 *     sehingga API key tidak ada di aplikasi.
 *  3. Balasan AI berisi blok JSON aksi (ADD_TRANSACTION / SET_ALLOCATION) yang dijalankan di sini
 *     lewat financeService (yang menyimpan ke RESTful API).
 *  Jika server belum punya GEMINI_API_KEY, dipakai mode simulasi (parser lokal).
 * ====================================================================================================
 */

import {
  addTransaction,
  calculateSmartBudget,
  formatRupiah,
  getAllocationLabel,
  getTransactions,
  setUserFinancialProfile,
} from "./financeService";
import { ApiError } from "./api/client";
import { requestAiReply } from "./api/chatApi";
import { todayStr } from "../lib/date";
import {
  AllocationConfig,
  ChatMessage,
  ChatResponseResult,
  FinancialAction,
  TransactionType,
} from "../types";

export type { ChatMessage, ChatResponseResult, FinancialAction };

/**
 * Mengekstrak nominal angka dari teks (misal: 25rb -> 25000, 8jt -> 8000000)
 */
function parseNaturalAmount(text: string): number {
  const lower = text.toLowerCase();
  const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/);
  if (jtMatch) {
    const val = parseFloat(jtMatch[1].replace(",", "."));
    return Math.round(val * 1000000);
  }

  const rbMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)/);
  if (rbMatch) {
    const val = parseFloat(rbMatch[1].replace(",", "."));
    return Math.round(val * 1000);
  }

  const numMatch = lower.match(/(?:rp\.?|rp\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/);
  if (numMatch) {
    const cleanNum = numMatch[1].replace(/\./g, "");
    return parseInt(cleanNum, 10) || 0;
  }

  return 0;
}

/**
 * Deteksi alokasi dinamis dari teks pengguna.
 * Mendukung format: "50-30-20", "50/30/20", "50 30 20", "10-40-50", dan lain-lain.
 * Mengembalikan AllocationConfig jika berhasil, atau null.
 */
function detectDynamicAllocation(text: string): AllocationConfig | null {
  const lower = text.toLowerCase();

  // Pola: angka-angka-angka (misal 50-30-20, 10/40/50, 40 40 20)
  const tripleMatch = lower.match(
    /(\d{1,3})\s*[-/]\s*(\d{1,3})\s*[-/]\s*(\d{1,3})/,
  );
  if (tripleMatch) {
    const a = parseInt(tripleMatch[1], 10);
    const b = parseInt(tripleMatch[2], 10);
    const c = parseInt(tripleMatch[3], 10);
    if (a + b + c > 0 && a <= 100 && b <= 100 && c <= 100) {
      return { needs: a, wants: b, savings: c };
    }
  }

  // Pola: angka spasi angka spasi angka (misal "50 30 20" di dalam kalimat "alokasi 50 30 20")
  const spaceMatch = lower.match(
    /(?:alokasi|atur|pakai|mau)\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/,
  );
  if (spaceMatch) {
    const a = parseInt(spaceMatch[1], 10);
    const b = parseInt(spaceMatch[2], 10);
    const c = parseInt(spaceMatch[3], 10);
    if (a + b + c > 0 && a <= 100 && b <= 100 && c <= 100) {
      return { needs: a, wants: b, savings: c };
    }
  }

  return null;
}

/**
 * Parser lokal cerdas (mode simulasi tanpa API key)
 */
function detectSimulatedAction(prompt: string): FinancialAction | null {
  const lower = prompt.toLowerCase();
  const detectedAlloc = detectDynamicAllocation(prompt);
  const amount = parseNaturalAmount(prompt);

  // Jika menyebutkan alokasi (preset maupun custom) atau gaji/uang saku
  if (
    detectedAlloc ||
    lower.includes("gaji") ||
    lower.includes("uang makan") ||
    lower.includes("alokasi")
  ) {
    if (amount > 0 || detectedAlloc) {
      const alloc = detectedAlloc || { needs: 50, wants: 30, savings: 20 };
      return {
        action: "SET_ALLOCATION",
        needs: alloc.needs,
        wants: alloc.wants,
        savings: alloc.savings,
        amount: amount > 0 ? amount : 0,
      };
    }
  }

  if (amount <= 0) return null;

  // Deteksi tipe transaksi
  const isIncome =
    lower.includes("dapat") ||
    lower.includes("dapet") ||
    lower.includes("terima") ||
    lower.includes("dikasih") ||
    lower.includes("nemu") ||
    lower.includes("masuk") ||
    lower.includes("pemasukan") ||
    lower.includes("bonus") ||
    lower.includes("cair") ||
    lower.includes("tambahan") ||
    lower.includes("penambahan") ||
    lower.includes("uang jajan") ||
    lower.includes("untung");

  // Deteksi kategori
  let category = isIncome ? "Pemasukan" : "Lainnya";
  if (
    lower.includes("makan") ||
    lower.includes("minum") ||
    lower.includes("kopi") ||
    lower.includes("soto") ||
    lower.includes("bakso")
  ) {
    category = "Makanan";
  } else if (
    lower.includes("bensin") ||
    lower.includes("grab") ||
    lower.includes("gojek") ||
    lower.includes("parkir") ||
    lower.includes("transport")
  ) {
    category = "Transportasi";
  } else if (
    lower.includes("beli") ||
    lower.includes("belanja") ||
    lower.includes("baju") ||
    lower.includes("sepatu")
  ) {
    category = "Belanja";
  } else if (
    lower.includes("listrik") ||
    lower.includes("air") ||
    lower.includes("wifi") ||
    lower.includes("pulsa") ||
    lower.includes("tagihan")
  ) {
    category = "Tagihan";
  }

  // Deteksi dompet
  let wallet = "Tunai";
  if (lower.includes("bca")) wallet = "BCA";
  else if (lower.includes("mandiri")) wallet = "Mandiri";
  else if (lower.includes("gopay") || lower.includes("go-pay"))
    wallet = "GoPay";
  else if (lower.includes("ovo")) wallet = "OVO";
  else if (lower.includes("bank") || lower.includes("rekening"))
    wallet = "Bank";

  let title = prompt.trim();
  if (title.length > 30) {
    title = `${category} (${wallet})`;
  }

  return {
    action: "ADD_TRANSACTION",
    title,
    amount,
    type: isIncome ? "income" : "expense",
    category,
    wallet,
  };
}

/**
 * MODE SIMULASI: dipakai bila server belum memiliki GEMINI_API_KEY.
 */
async function runSimulatedReply(userPrompt: string): Promise<ChatResponseResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  await new Promise((resolve) => setTimeout(resolve, 500));

  const detectedAction = detectSimulatedAction(userPrompt);
  if (detectedAction) {
    if (detectedAction.action === "SET_ALLOCATION") {
      const needs = detectedAction.needs ?? 50;
      const wants = detectedAction.wants ?? 30;
      const savings = detectedAction.savings ?? 20;
      const total = needs + wants + savings;

      // Validasi: total harus 100%
      if (total !== 100) {
        return {
          message:
            `Total persentase alokasimu sekarang ${total}%, tapi harus tepat 100%.\n\n` +
            `Kamu memasukkan:\n` +
            `  Kebutuhan Pokok: ${needs}%\n` +
            `  Keinginan: ${wants}%\n` +
            `  Tabungan: ${savings}%\n\n` +
            `Mau saya sesuaikan tabungannya jadi ${Math.max(0, 100 - needs - wants)}% agar genap 100%?`,
        };
      }

      if (detectedAction.amount <= 0) {
        return {
          message:
            `Sistem alokasi ${needs}-${wants}-${savings} sudah dipahami.\n\n` +
            `Sekarang, berapa gaji atau uang saku bulananmu?\n` +
            `Contoh: "gaji 8 juta" atau "uang saku 2.5jt"`,
        };
      }

      const alloc: AllocationConfig = { needs, wants, savings };
      await setUserFinancialProfile(detectedAction.amount, alloc);
      const smart = await calculateSmartBudget();

      return {
        message:
          `Siap! Alokasi keuanganmu sudah diterapkan:\n\n` +
          `Sistem: ${getAllocationLabel(alloc)}\n` +
          `Gaji: ${formatRupiah(detectedAction.amount)}\n\n` +
          `Rincian alokasi bulanan:\n` +
          `  Kebutuhan Pokok (${needs}%): ${formatRupiah(smart.needsBudget)}\n` +
          `  Keinginan (${wants}%): ${formatRupiah(smart.wantsBudget)}\n` +
          `  Tabungan (${savings}%): ${formatRupiah(smart.savingsBudget)}\n\n` +
          `Total uang belanja bulan ini: ${formatRupiah(smart.monthlySpendable)}\n` +
          `Jatah uang yang bisa digunakan hari ini: ${formatRupiah(smart.todayAvailable)}\n\n` +
          `Jika hari ini kamu hemat atau tidak jajan, sisa jatah otomatis di-rollover ke hari-hari berikutnya!`,
        action: detectedAction,
      };
    } else {
      await addTransaction({
        title: detectedAction.title || "Transaksi Baru",
        amount: detectedAction.amount,
        type: detectedAction.type || "expense",
        category: detectedAction.category || "Lainnya",
        wallet: detectedAction.wallet || "Tunai",
        date: todayStr(),
      });

      const smart = await calculateSmartBudget();
      const tipeStr =
        detectedAction.type === "income" ? "Pemasukan" : "Pengeluaran";

      return {
        message:
          `Berhasil mencatat ${tipeStr} ${detectedAction.title || ""} sebesar ${formatRupiah(detectedAction.amount)}.\n\n` +
          `Sisa uang yang bisa kamu gunakan hari ini: ${formatRupiah(smart.todayAvailable)}\n` +
          `Sisa uang belanja bulan ini: ${formatRupiah(smart.remainingSpendableMonth)}\n\n` +
          `Data langsung diperbarui di Dashboard UangKu!`,
        action: detectedAction,
      };
    }
  }

  const lower = userPrompt.toLowerCase();
  if (
    lower.includes("saldo") ||
    lower.includes("jatah") ||
    lower.includes("hari ini") ||
    lower.includes("sisa")
  ) {
    const smart = await calculateSmartBudget();
    if (smart.monthlyIncome === 0) {
      return {
        message:
          `Kamu belum mengatur gaji dan alokasi keuangan.\n\n` +
          `Silakan tentukan dulu sistem alokasimu. Contoh:\n` +
          `  "50-30-20 gaji 8 juta"\n` +
          `  "10-40-50 gaji 5jt"\n` +
          `  atau ketik aturan bebas kamu sendiri!`,
      };
    }
    return {
      message:
        `Kondisi keuanganmu saat ini (Alokasi ${smart.allocationLabel}):\n\n` +
        `  Uang yang bisa kamu gunakan hari ini: ${formatRupiah(smart.todayAvailable)}\n` +
        `  Sisa uang belanja bulan ini: ${formatRupiah(smart.remainingSpendableMonth)}\n` +
        `  Tabungan terkumpul: ${formatRupiah(smart.savingsBudget)}\n` +
        `  Sisa hari di bulan ini: ${smart.daysRemainingInMonth} hari`,
    };
  }

  return {
    message:
      `Halo! Saya Asisten Pintar UangKu.\n\n` +
      `Tentukan sistem alokasi anggaran kamu. Bisa pakai rekomendasi atau buat sendiri:\n\n` +
      `Rekomendasi populer:\n` +
      `  1. 50-30-20 (Kebutuhan 50%, Keinginan 30%, Tabungan 20%)\n` +
      `  2. 60-20-20 (Kebutuhan 60%, Keinginan 20%, Tabungan 20%)\n` +
      `  3. 70-20-10 (Kebutuhan 70%, Keinginan 20%, Tabungan 10%)\n` +
      `  4. 40-40-20 (Kebutuhan 40%, Keinginan 40%, Tabungan 20%)\n\n` +
      `Atau kamu bebas bikin sendiri! Misal: "10-40-50 gaji 5jt"\n\n` +
      `Yang penting total persentasenya pas 100%.`,
  };
}

/**
 * ----------------------------------------------------------------------------------------------------
 * FUNGSI UTAMA: sendChatMessage()
 * ----------------------------------------------------------------------------------------------------
 */
export async function sendChatMessage(
  history: ChatMessage[],
  userPrompt: string,
): Promise<ChatResponseResult> {
  try {
    const [smart, recentTx] = await Promise.all([
      calculateSmartBudget(),
      getTransactions(),
    ]);

    const recentListStr = recentTx
      .slice(0, 5)
      .map(
        (t) =>
          `  ${t.title} (${t.category}, ${t.wallet}): ${
            t.type === "income" ? "+" : "-"
          }${formatRupiah(t.amount)} [${t.date}]`,
      )
      .join("\n");

    const liveFinancialContext = `
=== KONTEKS PREDIKSI & KEUANGAN PENGGUNA (REALTIME) ===
- Tanggal: ${new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })} (Hari ke-${smart.currentDay} dari ${smart.totalDaysInMonth}, sisa ${smart.daysRemainingInMonth} hari)
- Penghasilan Bulanan: ${formatRupiah(smart.monthlyIncome)}
- Alokasi Aktif: ${smart.allocationLabel} (Kebutuhan ${smart.allocation.needs}%, Keinginan ${smart.allocation.wants}%, Tabungan ${smart.allocation.savings}%)
  * Budget Kebutuhan Pokok: ${formatRupiah(smart.needsBudget)}
  * Budget Keinginan: ${formatRupiah(smart.wantsBudget)}
  * Tabungan: ${formatRupiah(smart.savingsBudget)}
- Uang Belanja Bulan Ini: ${formatRupiah(smart.monthlySpendable)}
- Pengeluaran Bulan Ini: ${formatRupiah(smart.monthlyExpense)}
- Sisa Belanja Bulan Ini: ${formatRupiah(smart.remainingSpendableMonth)}
- Jatah Hari Ini: ${formatRupiah(smart.todayAllowance)}
- Pemasukan Hari Ini: +${formatRupiah(smart.todayIncome)}
- Pengeluaran Hari Ini: -${formatRupiah(smart.todayExpense)}
- Tersedia Hari Ini: ${formatRupiah(smart.todayAvailable)} ${
      smart.todayAvailable < 0 ? "(PERHATIAN: MINUS / DEFISIT HARI INI)" : ""
    }
- 5 Transaksi Terakhir:
${recentListStr || "  (Belum ada transaksi)"}
======================================================
`;

    let rawReply = "";
    try {
      rawReply = await requestAiReply({
        prompt: userPrompt,
        history,
        context: liveFinancialContext,
      });
    } catch (err) {
      // Server belum punya API key AI -> jalankan mode simulasi
      if (err instanceof ApiError && err.code === "AI_NOT_CONFIGURED") {
        return runSimulatedReply(userPrompt);
      }
      throw err;
    }

    // Ekstrak JSON blok dari balasan AI
    let action: FinancialAction | undefined = undefined;
    const jsonMatch = rawReply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      try {
        action = JSON.parse(jsonMatch[1]);
        rawReply = rawReply
          .replace(/```(?:json)?\s*[\s\S]*?\s*```/g, "")
          .trim();
      } catch (e) {
        console.warn("Failed to parse AI action JSON:", e);
      }
    }

    // Eksekusi aksi
    if (action) {
      if (action.action === "SET_ALLOCATION") {
        const needs = action.needs ?? 50;
        const wants = action.wants ?? 30;
        const savings = action.savings ?? 20;
        const total = needs + wants + savings;

        // Hanya simpan jika validasi lolos (total = 100)
        if (total === 100 && action.amount > 0) {
          await setUserFinancialProfile(action.amount, {
            needs,
            wants,
            savings,
          });
        }
      } else if (action.action === "SET_BASE_INCOME" && action.amount) {
        await setUserFinancialProfile(action.amount, smart.allocation);
      } else if (action.action === "ADD_TRANSACTION" && action.amount) {
        const lowerPrompt = userPrompt.toLowerCase();
        let finalType: TransactionType = action.type || "expense";
        const hasIncomeKeyword =
          lowerPrompt.includes("dapat") ||
          lowerPrompt.includes("dapet") ||
          lowerPrompt.includes("terima") ||
          lowerPrompt.includes("dikasih") ||
          lowerPrompt.includes("nemu") ||
          lowerPrompt.includes("pemasukan") ||
          lowerPrompt.includes("bonus") ||
          lowerPrompt.includes("uang masuk") ||
          lowerPrompt.includes("cair") ||
          lowerPrompt.includes("gaji") ||
          lowerPrompt.includes("tambahan") ||
          lowerPrompt.includes("penambahan") ||
          lowerPrompt.includes("uang jajan");

        const hasExpenseKeyword =
          lowerPrompt.includes("keluar") ||
          lowerPrompt.includes("beli") ||
          lowerPrompt.includes("bayar") ||
          lowerPrompt.includes("habis") ||
          lowerPrompt.includes("jajan") ||
          lowerPrompt.includes("belanja");

        if (action.type === "income" || (hasIncomeKeyword && !hasExpenseKeyword)) {
          finalType = "income";
        }

        const category =
          action.category && action.category !== "Lainnya"
            ? action.category
            : finalType === "income"
            ? "Pemasukan"
            : "Lainnya";

        const title =
          action.title && action.title !== "Transaksi AI"
            ? action.title
            : finalType === "income"
            ? "Pemasukan AI"
            : "Pengeluaran AI";

        await addTransaction({
          title,
          amount: action.amount,
          type: finalType,
          category,
          wallet: action.wallet || "Tunai",
          date: todayStr(),
        });
      }
    }

    return {
      message: rawReply,
      action,
    };
  } catch (err: any) {
    console.error("Chat API error:", err);
    return {
      message: `Gagal menghubungi asisten AI: ${err?.message || "Kesalahan jaringan"}`,
    };
  }
}
