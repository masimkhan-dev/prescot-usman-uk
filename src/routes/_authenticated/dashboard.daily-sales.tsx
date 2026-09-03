import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listDailySales,
  getDailySaleByDate,
  saveDailySale,
  voidDailySale,
  listDailyExpensesByDate,
  addDailyExpense,
  deleteDailyExpense,
} from "@/lib/daily-sales.functions";
import { useAuth } from "@/lib/auth-context";
import { formatGBP } from "@/lib/utils";
import { toastSuccess, toastError } from "@/lib/toast";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  CalendarCheck,
  Banknote,
  CreditCard,
  Building2,
  Calculator,
  Loader2,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  Ban,
  RotateCcw,
  Sparkles,
  Info,
  Receipt,
  Plus,
  TrendingDown,
  TrendingUp,
  Tag,
  Wrench,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/daily-sales")({
  component: DailySalesPage,
});

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const EXPENSE_CATEGORIES = [
  "Repair Parts Cost",
  "Wages / Staff Salary",
  "Shop Supplies / Utilities",
  "Food & Refreshments",
  "Courier & Postage",
  "Other Expenses",
];

function DailySalesPage() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const todayStr = getTodayString();

  const listFn = useServerFn(listDailySales);
  const getByDateFn = useServerFn(getDailySaleByDate);
  const saveFn = useServerFn(saveDailySale);
  const voidFn = useServerFn(voidDailySale);

  const listExpensesFn = useServerFn(listDailyExpensesByDate);
  const addExpenseFn = useServerFn(addDailyExpense);
  const deleteExpenseFn = useServerFn(deleteDailyExpense);

  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voidPromptId, setVoidPromptId] = useState<string | null>(null);
  const [voidReasonText, setVoidReasonText] = useState("");
  const [voiding, setVoiding] = useState(false);

  // Daily Sales Form state
  const [entryDate, setEntryDate] = useState(todayStr);
  const [staffName, setStaffName] = useState("");
  const [cashAmountStr, setCashAmountStr] = useState("");
  const [cardAmountStr, setCardAmountStr] = useState("");
  const [bankAmountStr, setBankAmountStr] = useState("");
  const [notes, setNotes] = useState("");

  // Daily Expense Entry inline state
  const [expenseCategory, setExpenseCategory] = useState("Repair Parts Cost");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmountStr, setExpenseAmountStr] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);

  // Default staff name from logged in user email / name
  useEffect(() => {
    if (!staffName && user?.email) {
      const defaultName = user.email.split("@")[0].replace(/[._]/g, " ");
      setStaffName(defaultName.charAt(0).toUpperCase() + defaultName.slice(1));
    }
  }, [user, staffName]);

  // Fetch list of daily entries (enriched with expenses and net)
  const { data: salesList, isLoading } = useQuery({
    queryKey: ["daily-sales-list", page],
    queryFn: () => listFn({ data: { page, limit: 30 } }),
    staleTime: 1000 * 30,
  });

  // Fetch today's entry to check if already recorded
  const { data: todayEntry, isLoading: isTodayLoading } = useQuery({
    queryKey: ["daily-sale-today", todayStr],
    queryFn: () => getByDateFn({ data: { date: todayStr } }),
    staleTime: 1000 * 30,
  });

  // If today's entry already exists and form has not been modified, prefill it for editing
  useEffect(() => {
    if (todayEntry && !editingId && cashAmountStr === "" && cardAmountStr === "" && bankAmountStr === "") {
      setEditingId(todayEntry.id);
      setEntryDate(todayEntry.entry_date);
      setStaffName(todayEntry.staff_name);
      setCashAmountStr(Number(todayEntry.cash_amount) > 0 ? String(todayEntry.cash_amount) : "");
      setCardAmountStr(Number(todayEntry.card_amount) > 0 ? String(todayEntry.card_amount) : "");
      setBankAmountStr(Number(todayEntry.bank_amount) > 0 ? String(todayEntry.bank_amount) : "");
      setNotes(todayEntry.notes || "");
    }
  }, [todayEntry]);

  // Fetch expenses recorded for the current selected closing date
  const { data: dateExpenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ["daily-expenses", entryDate],
    queryFn: () => listExpensesFn({ data: { date: entryDate } }),
    staleTime: 1000 * 15,
  });

  // Calculate live dynamic numbers
  const cashNum = parseFloat(cashAmountStr) || 0;
  const cardNum = parseFloat(cardAmountStr) || 0;
  const bankNum = parseFloat(bankAmountStr) || 0;
  const liveTotalSales = Math.round((cashNum + cardNum + bankNum) * 100) / 100;

  const totalDayExpenses = (dateExpenses ?? []).reduce(
    (sum, exp) => sum + (exp.amount_pence || 0) / 100,
    0,
  );
  const liveNet = Math.round((liveTotalSales - totalDayExpenses) * 100) / 100;

  // Handle editing an existing record
  function handleStartEdit(row: {
    id: string;
    entry_date: string;
    staff_name: string;
    cash_amount: number;
    card_amount: number;
    bank_amount: number;
    notes: string | null;
  }) {
    setEditingId(row.id);
    setEntryDate(row.entry_date);
    setStaffName(row.staff_name);
    setCashAmountStr(row.cash_amount > 0 ? String(row.cash_amount) : "");
    setCardAmountStr(row.card_amount > 0 ? String(row.card_amount) : "");
    setBankAmountStr(row.bank_amount > 0 ? String(row.bank_amount) : "");
    setNotes(row.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleResetForm() {
    setEditingId(null);
    setEntryDate(todayStr);
    setCashAmountStr("");
    setCardAmountStr("");
    setBankAmountStr("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!staffName.trim()) {
      toastError("Please provide the Staff Name");
      return;
    }

    if (liveTotalSales <= 0) {
      toastError("Total sales must be greater than £0.00. Please enter cash, card, or bank amounts.");
      return;
    }

    setSubmitting(true);
    try {
      await saveFn({
        data: {
          id: editingId ?? undefined,
          entry_date: entryDate,
          staff_name: staffName.trim(),
          cash_amount: Math.max(0, cashNum),
          card_amount: Math.max(0, cardNum),
          bank_amount: Math.max(0, bankNum),
          notes: notes.trim() || null,
        },
      });

      toastSuccess(
        editingId ? "Daily sales closing updated successfully" : "Daily sales closing recorded successfully",
      );
      handleResetForm();
      queryClient.invalidateQueries({ queryKey: ["daily-sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sale-today"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch (err: unknown) {
      toastError(err, "Failed to save daily sales entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVoid(id: string) {
    if (!voidReasonText.trim()) {
      toastError("Please enter a reason for voiding this daily sales closing");
      return;
    }

    setVoiding(true);
    try {
      await voidFn({ data: { id, void_reason: voidReasonText.trim() } });
      toastSuccess("Daily closing entry voided");
      setVoidPromptId(null);
      setVoidReasonText("");
      if (editingId === id) handleResetForm();
      queryClient.invalidateQueries({ queryKey: ["daily-sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sale-today"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } catch (err: unknown) {
      toastError(err, "Failed to void daily closing entry");
    } finally {
      setVoiding(false);
    }
  }

  // Handle adding an expense for the selected closing date
  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(expenseAmountStr);
    if (isNaN(amt) || amt <= 0) {
      toastError("Please enter a valid expense amount greater than £0.00");
      return;
    }
    if (!expenseDesc.trim()) {
      toastError("Please enter an expense description (e.g. Screen part, Wages, Supplies)");
      return;
    }

    setAddingExpense(true);
    try {
      await addExpenseFn({
        data: {
          expense_date: entryDate,
          category: expenseCategory.trim(),
          description: expenseDesc.trim(),
          amount: amt,
        },
      });
      toastSuccess(`Expense of ${formatGBP(amt)} recorded for ${entryDate}`);
      setExpenseDesc("");
      setExpenseAmountStr("");
      queryClient.invalidateQueries({ queryKey: ["daily-expenses", entryDate] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: unknown) {
      toastError(err, "Failed to add expense");
    } finally {
      setAddingExpense(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    try {
      await deleteExpenseFn({ data: { id } });
      toastSuccess("Expense removed");
      queryClient.invalidateQueries({ queryKey: ["daily-expenses", entryDate] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales-list"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err: unknown) {
      toastError(err, "Failed to remove expense");
    }
  }

  const rows = salesList?.rows ?? [];
  const totalEntries = salesList?.total ?? 0;

  // Aggregate totals for displayed table page (active non-void only)
  const activeRows = rows.filter((r) => !r.is_void);
  const pageCashTotal = activeRows.reduce((s, r) => s + Number(r.cash_amount || 0), 0);
  const pageCardTotal = activeRows.reduce((s, r) => s + Number(r.card_amount || 0), 0);
  const pageBankTotal = activeRows.reduce((s, r) => s + Number(r.bank_amount || 0), 0);
  const pageSalesGrandTotal = activeRows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const pageExpensesTotal = activeRows.reduce((s, r) => s + (Number(r.expenses_amount) || 0), 0);
  const pageNetTotal = activeRows.reduce((s, r) => s + (Number(r.net_amount) || 0), 0);

  return (
    <div className="db-page space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-brand" />
            <h1 className="db-page-title">Daily Sales &amp; Expenses Closing</h1>
            <PageHelpButton
              pageTitle="Daily Sales & Expenses Closing"
              pageKey="daily-sales"
              steps={[
                "Enter end-of-day sales: Cash, Card, and Bank Transfer.",
                "Log daily expenses such as repair parts cost, staff wages, and supplies.",
                "Total Sales, Total Expenses, and Net are automatically calculated.",
                "This serves as Prescot's primary turnover and cashflow accounting in Reports.",
                "Invoices (repairs, retail sales, phone buys) are kept separate for records.",
              ]}
              firstTimeTip="Tip: Enter your 3 sales numbers, log any day expenses, and the system computes Net = Total Sales - Expenses automatically."
            />
          </div>
          <p className="db-page-subtitle">
            Authoritative shop turnover and daily cashflow. Register closing for Cash, Card, Bank, and day expenses.
          </p>
        </div>

        {/* Date Indicator Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-muted/60 border border-border text-xs font-semibold text-foreground">
          <Clock className="w-3.5 h-3.5 text-brand" />
          <span>Today: {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {/* Today's Status Banner */}
      {!isTodayLoading && (
        <div>
          {todayEntry ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-200">
                    Today&apos;s closing is recorded:
                  </span>{" "}
                  <span className="font-extrabold text-foreground tabular-nums">
                    Total {formatGBP(Number(todayEntry.total_amount))}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    (Cash: {formatGBP(Number(todayEntry.cash_amount))} • Card: {formatGBP(Number(todayEntry.card_amount))} • Bank: {formatGBP(Number(todayEntry.bank_amount))})
                  </span>
                  {todayEntry.staff_name && (
                    <span className="text-muted-foreground ml-1">
                      {" "}by <strong>{todayEntry.staff_name}</strong>
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleStartEdit(todayEntry)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors shrink-0 cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Pencil className="w-3 h-3" /> Edit Today&apos;s Entry
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2.5 text-amber-800 dark:text-amber-200">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Closing Pending:</strong> Today&apos;s daily sales closing has not been entered yet. Enter the 3 numbers below to close today&apos;s takings.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Closing Entry Card */}
      <div className="db-card p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand" />
            <h2 className="text-base font-extrabold text-foreground">
              {editingId ? "Edit Daily Sales Entry" : "Record Daily Sales Closing"}
            </h2>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Row: Date & Staff Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Closing Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="db-input font-medium"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Trading date for which sales and expenses were collected.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Staff Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Usman, Alex"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="db-input font-medium"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Staff member responsible for counting and recording.
              </p>
            </div>
          </div>

          {/* Core 3 Sales Number Inputs */}
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <span>Enter 3 Payment Totals</span>
              <span className="text-brand font-bold text-[10px] normal-case bg-brand/10 px-2 py-0.5 rounded-md">
                Fast Closing Flow
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cash Sales */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 hover:border-brand/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash Sales</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                    Till / Drawer
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                    £
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={cashAmountStr}
                    onChange={(e) => setCashAmountStr(e.target.value)}
                    className="db-input !pl-8 text-base font-extrabold tabular-nums"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Cash collected in till / drawer today.
                </p>
              </div>

              {/* Card Sales */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 hover:border-brand/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Card Sales</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                    Card Terminal
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                    £
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={cardAmountStr}
                    onChange={(e) => setCardAmountStr(e.target.value)}
                    className="db-input !pl-8 text-base font-extrabold tabular-nums"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Card machine settlement total.
                </p>
              </div>

              {/* Bank Transfer */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 hover:border-brand/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Bank Transfer</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                    Direct Wire
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                    £
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={bankAmountStr}
                    onChange={(e) => setBankAmountStr(e.target.value)}
                    className="db-input !pl-8 text-base font-extrabold tabular-nums"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Direct bank transfer payments received.
                </p>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Busy Saturday, screen repairs and 2 phone sales"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="db-input text-xs"
            />
          </div>

          {/* Day Expenses Section — Log repair parts, wages, salary, supplies directly during closing */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                  Today&apos;s Expenses &amp; Outgoings for {entryDate}
                </h3>
              </div>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                Total Expenses Today: {formatGBP(totalDayExpenses)}
              </span>
            </div>

            {/* Quick Category Selector Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Quick Category Presets:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setExpenseCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      expenseCategory === cat
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Inline Add Expense Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  placeholder="Category (e.g. Repair Parts Cost, Wages)"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="db-input text-xs font-medium"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Description (e.g. iPhone 13 screen part, Tech wage)"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="db-input text-xs font-medium"
                />
              </div>
              <div className="sm:col-span-2 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">
                  £
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={expenseAmountStr}
                  onChange={(e) => setExpenseAmountStr(e.target.value)}
                  className="db-input !pl-6 text-xs font-extrabold tabular-nums"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="button"
                  disabled={addingExpense || !expenseDesc.trim() || !expenseAmountStr}
                  onClick={handleAddExpense}
                  className="w-full h-full min-h-[36px] rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  title="Add this expense to today's closing"
                >
                  {addingExpense ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span className="sm:hidden">Add Expense</span>
                </button>
              </div>
            </div>

            {/* List of expenses recorded for this date */}
            {dateExpenses.length > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Recorded Expenses for {entryDate}:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dateExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs gap-2"
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                            {exp.category}
                          </span>
                          <span className="font-bold text-foreground truncate">
                            {exp.description}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                          {formatGBP((exp.amount_pence || 0) / 100)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Remove expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic pt-1">
                No expenses recorded for this date yet. Add repair parts, wages, or supplies above if applicable.
              </p>
            )}
          </div>

          {/* Automatic Reactive Hero Widget: Total Sales - Expenses = Net */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border-2 border-brand/30 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5">
            <div className="space-y-2 w-full xl:w-auto">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand">
                  Live Dynamic Closing Balance
                </span>
              </div>

              {/* 3-Part Live Calculation Display */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Total Sales (Takings)
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-brand tabular-nums">
                    {formatGBP(liveTotalSales)}
                  </span>
                </div>

                <span className="text-xl font-bold text-muted-foreground sm:pt-4">−</span>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Total Day Expenses
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-rose-600 tabular-nums">
                    {formatGBP(totalDayExpenses)}
                  </span>
                </div>

                <span className="text-xl font-bold text-muted-foreground sm:pt-4">=</span>

                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                    Net Daily Profit
                  </span>
                  <span
                    className={`text-2xl sm:text-3xl font-black tabular-nums ${
                      liveNet >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {formatGBP(liveNet)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-mono">
                Sales: {formatGBP(cashNum)} (Cash) + {formatGBP(cardNum)} (Card) + {formatGBP(bankNum)} (Bank)
                {totalDayExpenses > 0 && ` | Less ${formatGBP(totalDayExpenses)} expenses`}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || liveTotalSales <= 0}
              className="w-full xl:w-auto px-6 py-3.5 rounded-xl bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : editingId ? (
                <>
                  <Pencil className="w-4 h-4" />
                  <span>Update Daily Closing</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Daily Sales Closing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Summary KPI Cards of Current View */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Cash Takings", value: formatGBP(pageCashTotal), icon: Banknote, color: "text-emerald-700" },
          { label: "Card Takings", value: formatGBP(pageCardTotal), icon: CreditCard, color: "text-blue-700" },
          { label: "Bank Transfers", value: formatGBP(pageBankTotal), icon: Building2, color: "text-purple-700" },
          { label: "Total Sales", value: formatGBP(pageSalesGrandTotal), icon: Calculator, color: "text-brand" },
          { label: "Day Expenses", value: formatGBP(pageExpensesTotal), icon: Receipt, color: "text-rose-600" },
          {
            label: "Net Profit",
            value: formatGBP(pageNetTotal),
            icon: TrendingUp,
            color: pageNetTotal >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="db-card p-3.5 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">{kpi.label}</span>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className={`text-lg font-extrabold tabular-nums tracking-tight truncate ${kpi.color}`}>
                {kpi.value}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">In recent entries</div>
            </div>
          );
        })}
      </div>

      {/* Historical Daily Sales Entries Table */}
      <div className="db-card !p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="db-card-title">Daily Sales Closing History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authoritative daily turnover and net profit records ({totalEntries} total entries recorded).
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={9} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<CalendarCheck className="w-6 h-6 text-brand" />}
              title="No daily sales recorded yet"
              description="Enter today's cash, card, and bank takings above to record the first closing."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="db-table">
              <thead>
                <tr>
                  <th className="db-th">Date</th>
                  <th className="db-th">Staff</th>
                  <th className="db-th text-right">Cash</th>
                  <th className="db-th text-right">Card</th>
                  <th className="db-th text-right">Bank Transfer</th>
                  <th className="db-th text-right text-brand">Total Sales</th>
                  <th className="db-th text-right text-rose-600">Expenses</th>
                  <th className="db-th text-right">Net Profit</th>
                  <th className="db-th">Notes</th>
                  <th className="db-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isVoid = Boolean(row.is_void);
                  return (
                    <tr
                      key={row.id}
                      className={isVoid ? "opacity-60 bg-muted/20" : "db-tr-hover"}
                    >
                      <td className="db-td font-extrabold text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{row.entry_date}</span>
                          {isVoid && (
                            <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-wider">
                              VOIDED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="db-td font-semibold text-muted-foreground whitespace-nowrap">
                        {row.staff_name}
                      </td>
                      <td
                        className={`db-td text-right font-mono tabular-nums ${
                          isVoid ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {formatGBP(Number(row.cash_amount))}
                      </td>
                      <td
                        className={`db-td text-right font-mono tabular-nums ${
                          isVoid ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {formatGBP(Number(row.card_amount))}
                      </td>
                      <td
                        className={`db-td text-right font-mono tabular-nums ${
                          isVoid ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {formatGBP(Number(row.bank_amount))}
                      </td>
                      <td
                        className={`db-td text-right font-mono tabular-nums ${
                          isVoid ? "line-through text-muted-foreground font-semibold" : "font-black text-brand"
                        }`}
                      >
                        {formatGBP(Number(row.total_amount))}
                      </td>
                      <td
                        className={`db-td text-right font-mono tabular-nums ${
                          isVoid ? "line-through text-muted-foreground" : "font-bold text-rose-600"
                        }`}
                      >
                        {formatGBP(Number(row.expenses_amount || 0))}
                      </td>
                      <td
                        className={`db-td text-right font-mono tabular-nums ${
                          isVoid
                            ? "text-muted-foreground italic font-normal text-xs"
                            : Number(row.net_amount || 0) >= 0
                            ? "font-black text-emerald-700 dark:text-emerald-400"
                            : "font-black text-destructive"
                        }`}
                      >
                        {isVoid ? "Voided (£0.00)" : formatGBP(Number(row.net_amount || 0))}
                      </td>
                      <td className="db-td text-xs text-muted-foreground max-w-xs truncate">
                        {isVoid ? (
                          <span className="text-destructive font-medium">
                            Voided: {row.void_reason || "No reason given"}
                          </span>
                        ) : (
                          row.notes || "—"
                        )}
                      </td>
                      <td className="db-td text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isVoid ? (
                            <span className="text-[11px] text-muted-foreground italic px-2 py-1">
                              Record voided
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(row)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Edit this entry"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {role === "admin" && (
                                <>
                                  {voidPromptId === row.id ? (
                                    <div className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 p-1 rounded-lg text-xs">
                                      <input
                                        type="text"
                                        placeholder="Reason for voiding..."
                                        value={voidReasonText}
                                        onChange={(e) => setVoidReasonText(e.target.value)}
                                        className="px-2 py-0.5 text-[11px] rounded bg-background border border-border outline-none min-w-[140px]"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        disabled={voiding || !voidReasonText.trim()}
                                        onClick={() => handleVoid(row.id)}
                                        className="px-2 py-0.5 bg-destructive hover:bg-destructive/90 text-white rounded text-[10px] font-bold disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                      >
                                        {voiding ? "..." : "Void"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setVoidPromptId(null);
                                          setVoidReasonText("");
                                        }}
                                        className="text-[10px] text-muted-foreground hover:underline cursor-pointer px-1"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVoidPromptId(row.id);
                                        setVoidReasonText("");
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                      title="Void this daily sales entry (record will be kept in audit)"
                                    >
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalEntries > 30 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Showing {page * 30 + 1}–{Math.min((page + 1) * 30, totalEntries)} of {totalEntries} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1 rounded-lg border border-border disabled:opacity-50 text-foreground font-semibold cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={(page + 1) * 30 >= totalEntries}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg border border-border disabled:opacity-50 text-foreground font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
