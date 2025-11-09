import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import type { Voucher } from "../types";

// ---------- Helpers ----------
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const categories = [
  "General",
  "Shopping",
  "Food",
  "Travel",
  "Recharge",
  "Subscription",
] as const;
type Category = (typeof categories)[number] | "All";

type SortKey =
  | "created_desc"
  | "value_desc"
  | "value_asc"
  | "expiry_asc"
  | "remaining_desc"
  | "status_used_first"
  | "status_unused_first";

// Expiry overrides stored status to expired (display-only)
function deriveStatus(v: Voucher): "unused" | "used" | "expired" {
  if (v.expires_on) {
    const end = new Date(v.expires_on);
    end.setHours(23, 59, 59, 999);
    if (end.getTime() < Date.now()) return "expired";
  }
  return (v.status as "unused" | "used" | "expired") || "unused";
}

// sanitize number-like strings, strip non-digits (keep dot) & leading zeros
const cleanNumString = (s: string) =>
  s === "" ? "" : s.replace(/[^\d.]/g, "").replace(/^0+(?=\d)/, "");

export default function Vouchers() {
  const [list, setList] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  // -------- Add form state --------
  const [name, setName] = useState("");
  const [value, setValue] = useState<string>(""); // keep as string for input control
  const [initialUsed, setInitialUsed] = useState<string>(""); // NEW optional initial spent
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [expires, setExpires] = useState<string>("");
  const [category, setCategory] = useState<string>("General");

  // -------- UI state --------
  const [filterCategory, setFilterCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("created_desc");

  // -------- Modals --------
  const [useItem, setUseItem] = useState<Voucher | null>(null);
  const [useAmount, setUseAmount] = useState<string>(""); // Partial Usage amount

  const [editItem, setEditItem] = useState<Voucher | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    value: "",
    category: "General",
    code: "",
    pin: "",
    expires_on: "",
  });

  // -------- Data fetch --------
  async function fetchAll() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setList([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setList(data as Voucher[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // -------- Derived: filter + search + sort --------
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    let arr = list.filter((v) => {
      const inCategory = filterCategory === "All" ? true : v.category === filterCategory;
      const inSearch =
        !term ||
        v.name?.toLowerCase().includes(term) ||
        v.code?.toLowerCase().includes(term) ||
        v.category?.toLowerCase().includes(term);
      return inCategory && inSearch;
    });

    const remaining = (v: Voucher) => Math.max(0, (v.value || 0) - (v.spent || 0));
    const expMs = (v: Voucher) =>
      v.expires_on ? new Date(v.expires_on).getTime() : Number.POSITIVE_INFINITY;

    switch (sort) {
      case "value_desc":
        arr = [...arr].sort((a, b) => (b.value || 0) - (a.value || 0));
        break;
      case "value_asc":
        arr = [...arr].sort((a, b) => (a.value || 0) - (b.value || 0));
        break;
      case "expiry_asc":
        arr = [...arr].sort((a, b) => expMs(a) - expMs(b));
        break;
      case "remaining_desc":
        arr = [...arr].sort((a, b) => remaining(b) - remaining(a));
        break;
      case "status_used_first":
        arr = [...arr].sort((a, b) => {
          const sa = deriveStatus(a);
          const sb = deriveStatus(b);
          // used < unused < expired (used first)
          const rank = { used: 0, unused: 1, expired: 2 } as const;
          return rank[sa] - rank[sb];
        });
        break;
      case "status_unused_first":
        arr = [...arr].sort((a, b) => {
          const sa = deriveStatus(a);
          const sb = deriveStatus(b);
          // unused < used < expired (unused first)
          const rank = { unused: 0, used: 1, expired: 2 } as const;
          return rank[sa] - rank[sb];
        });
        break;
      case "created_desc":
      default:
        // already ordered by created_at desc from DB
        break;
    }
    return arr;
  }, [list, filterCategory, search, sort]);

  // -------- Add voucher --------
  async function addVoucher() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const numericValue = Number(value.replace(/^0+(?=\d)/, ""));
    const numericInitialUsed = initialUsed
      ? Number(initialUsed.replace(/^0+(?=\d)/, ""))
      : 0;

    if (!name.trim()) return alert("Please enter name");
    if (!Number.isFinite(numericValue) || numericValue <= 0)
      return alert("Enter a valid amount > 0");
    if (!Number.isFinite(numericInitialUsed) || numericInitialUsed < 0)
      return alert("Initial used amount must be ≥ 0");
    if (numericInitialUsed > numericValue)
      return alert("Initial used amount cannot exceed total value");

    const insert = {
      user_id: user.id,
      name: name.trim(),
      value: numericValue,
      spent: numericInitialUsed,
      category,
      code: code.trim() || null,
      pin: pin.trim() || null,
      expires_on: expires || null,
      status: numericInitialUsed >= numericValue ? ("used" as const) : ("unused" as const),
    };

    const { error } = await supabase.from("vouchers").insert(insert);
    if (error) return alert(error.message);

    // reset form
    setName("");
    setValue("");
    setInitialUsed("");
    setCode("");
    setPin("");
    setExpires("");
    setCategory("General");
    fetchAll();
  }

  // -------- Delete --------
  async function remove(id: string) {
    if (!confirm("Delete this voucher?")) return;
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (!error) fetchAll();
  }

  // -------- Partial Usage Modal --------
  function openPartialUsage(v: Voucher) {
    setUseItem(v);
    setUseAmount("");
  }

  async function savePartialUsage() {
    if (!useItem) return;
    const amt = Number(useAmount.replace(/^0+(?=\d)/, ""));
    if (!Number.isFinite(amt) || amt <= 0) return alert("Amount must be > 0");
    const remaining = (useItem.value || 0) - (useItem.spent || 0);
    if (amt > remaining) return alert("Amount exceeds remaining balance");

    const newSpent = (useItem.spent || 0) + amt;
    const newStatus = newSpent >= (useItem.value || 0) ? "used" : "unused";

    const { error } = await supabase
      .from("vouchers")
      .update({ spent: newSpent, status: newStatus })
      .eq("id", useItem.id);

    if (error) return alert(error.message);
    setUseItem(null);
    fetchAll();
  }

  // -------- Edit Modal --------
  function openEdit(v: Voucher) {
    setEditItem(v);
    setEditForm({
      name: v.name || "",
      value: String(v.value ?? ""),
      category: v.category || "General",
      code: v.code || "",
      pin: v.pin || "",
      expires_on: v.expires_on ? v.expires_on.substring(0, 10) : "",
    });
  }

  async function saveEdit() {
    if (!editItem) return;
    const numericValue = Number(editForm.value.replace(/^0+(?=\d)/, ""));
    if (!editForm.name.trim()) return alert("Please enter name");
    if (!Number.isFinite(numericValue) || numericValue <= 0)
      return alert("Enter a valid amount > 0");

    // If value reduced below spent, clamp spent (business rule: keep spent as is, but can't exceed value)
    const current = list.find((x) => x.id === editItem.id);
    let payload: any = {
      name: editForm.name.trim(),
      value: numericValue,
      category: editForm.category,
      code: editForm.code.trim() || null,
      pin: editForm.pin.trim() || null,
      expires_on: editForm.expires_on || null,
    };

    if (current) {
      const clampedSpent = Math.min(current.spent || 0, numericValue);
      const newStatus = clampedSpent >= numericValue ? "used" : current.status || "unused";
      payload = { ...payload, spent: clampedSpent, status: newStatus };
    }

    const { error } = await supabase.from("vouchers").update(payload).eq("id", editItem.id);
    if (error) return alert(error.message);
    setEditItem(null);
    fetchAll();
  }

  // -------- Toggle Used/Unused (with amount rules) --------
  // Mark as Used  -> spent = value, status = "used"
  // Mark as Unused -> spent = 0, status = "unused"
  async function toggleStatus(v: Voucher) {
    const makeUsed = v.status === "unused";
    const payload = makeUsed
      ? { spent: v.value, status: "used" as const }
      : { spent: 0, status: "unused" as const };

    const { error } = await supabase.from("vouchers").update(payload).eq("id", v.id);
    if (!error) fetchAll();
  }

  // -------- WhatsApp share --------
  function shareWhatsApp(v: Voucher) {
    const rem = Math.max(0, (v.value || 0) - (v.spent || 0));
    const daysLeft =
      v.expires_on
        ? Math.ceil(
            (new Date(v.expires_on).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : null;

    const msg =
      `🎁 *${v.name}*\n` +
      `💰 Value: ${inr(v.value)}\n` +
      `✅ Used: ${inr(v.spent)}\n` +
      `💵 Remaining: ${inr(rem)}\n` +
      `📅 Expiry: ${v.expires_on ? new Date(v.expires_on).toLocaleDateString() : "-"}${
        daysLeft !== null ? ` (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)` : ""
      }\n` +
      `🏷️ Category: ${v.category}\n` +
      `📌 Code: ${v.code || "-"}\n` +
      `🔐 PIN: ${v.pin || "-"}\n` +
      `📈 Status: ${deriveStatus(v)}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // -------- Excel export --------
  async function exportExcel() {
    const rows = list.map((v) => ({
      name: v.name,
      value: v.value,
      spent: v.spent,
      remaining: Math.max(0, (v.value || 0) - (v.spent || 0)),
      category: v.category,
      code: v.code ?? "",
      pin: v.pin ?? "",
      expires_on: v.expires_on ?? "",
      status: deriveStatus(v),
      created_at: v.created_at,
    }));

    const [{ utils, writeFile, book_new, aoa_to_sheet, book_append_sheet }] = await Promise.all(
      [
        import("xlsx").then((m) => ({
          utils: m.utils,
          writeFile: m.writeFile,
          book_new: m.utils.book_new,
          aoa_to_sheet: m.utils.aoa_to_sheet,
          book_append_sheet: m.utils.book_append_sheet,
        })),
      ]
    );

    const headers = Object.keys(rows[0] ?? { sample: "" });
    const data = [headers, ...rows.map((r) => headers.map((h) => (r as any)[h]))];
    const wb = book_new();
    const ws = aoa_to_sheet(data);
    book_append_sheet(wb, ws, "vouchers");

    try {
      await writeFile(wb as any, "vouchers.xlsx");
    } catch {
      const XLSX = await import("xlsx");
      const blob = new Blob(
        [XLSX.write(wb as any, { bookType: "xlsx", type: "array" })],
        { type: "application/octet-stream" }
      );
      const { saveAs } = await import("file-saver");
      saveAs(blob, "vouchers.xlsx");
    }
  }

  // -------- Excel import --------
  // headers: name,value,spent,category,code,pin,expires_on,status
  async function importExcel(file: File) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return alert("Not logged in");

    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

    const toNum = (s: any) => {
      const n = Number(String(s).replace(/^0+(?=\d)/, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const payload = rows
      .map((r) => {
        const value = toNum(r.value);
        const spent = Math.max(0, toNum(r.spent || 0));
        return {
          user_id: user.id,
          name: String(r.name || "").trim(),
          value,
          spent: Math.min(spent, value),
          category: String(r.category || "General"),
          code: r.code ? String(r.code) : null,
          pin: r.pin ? String(r.pin) : null,
          expires_on: r.expires_on ? String(r.expires_on) : null,
          status: (spent >= value ? "used" : "unused") as "used" | "unused" | "expired",
        };
      })
      .filter((r) => r.name && r.value > 0);

    if (!payload.length) return alert("No valid rows found.");
    const { error } = await supabase.from("vouchers").insert(payload);
    if (error) return alert(error.message);
    fetchAll();
  }

  // ---------- UI ----------
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 text-neutral-100">
      {/* Header / Controls */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Voucher Wallet</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="Search by name / code / category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              title="Sort"
            >
              <option value="created_desc">Newest</option>
              <option value="value_desc">Value ↓</option>
              <option value="value_asc">Value ↑</option>
              <option value="remaining_desc">Remaining ↓</option>
              <option value="expiry_asc">Expiry (Soonest)</option>
              <option value="status_used_first">Status: Used first</option>
              <option value="status_unused_first">Status: Unused first</option>
            </select>

            <button
              onClick={exportExcel}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm"
            >
              Export
            </button>

            <label className="rounded-xl bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-sm cursor-pointer">
              Import
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importExcel(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Voucher Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <h2 className="font-semibold mb-4 text-lg">Add Voucher</h2>
          <div className="grid gap-3">
            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              type="text"
              inputMode="decimal"
              placeholder="Value"
              value={value}
              onChange={(e) => setValue(cleanNumString(e.target.value))}
            />

            {/* NEW: Initial used amount (optional) */}
            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              type="text"
              inputMode="decimal"
              placeholder="Initial used amount (optional)"
              value={initialUsed}
              onChange={(e) => setInitialUsed(cleanNumString(e.target.value))}
            />

            <select
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="Code (optional)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="PIN (optional)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />

            <button
              onClick={addVoucher}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        {/* List Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["All", ...categories] as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterCategory === cat
                    ? "bg-sky-600 text-white"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <h2 className="font-semibold mb-3 text-lg">Your Vouchers</h2>

          {loading ? (
            <div className="animate-pulse text-neutral-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-neutral-400">No vouchers yet.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((v) => {
                const rem = Math.max(0, (v.value || 0) - (v.spent || 0));
                const percent = v.value
                  ? Math.min(100, Math.round(((v.spent || 0) / v.value) * 100))
                  : 0;
                const status = deriveStatus(v);

                return (
                  <div
                    key={v.id}
                    className="p-4 border border-neutral-800 rounded-2xl bg-gradient-to-b from-neutral-950 to-neutral-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{v.name}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              status === "expired"
                                ? "bg-red-600/20 text-red-400 border border-red-600/30"
                                : status === "used"
                                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                                : "bg-sky-600/20 text-sky-300 border border-sky-600/30"
                            }`}
                          >
                            {status.toUpperCase()}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
                            {v.category}
                          </span>
                        </div>

                        <div className="mt-1 text-sm text-neutral-400">
                          {inr(v.value)} • Used {inr(v.spent)} • Remaining {inr(rem)}
                        </div>
                        <div className="text-sm text-neutral-400">
                          Expiry: {v.expires_on ? new Date(v.expires_on).toLocaleDateString() : "-"}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {/* Toggle used/unused with required behavior */}
                        <button
                          onClick={() => toggleStatus(v)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
                        >
                          {v.status === "unused" ? "Mark as Used" : "Mark as Unused"}
                        </button>

                        {/* Partial Usage */}
                        <button
                          onClick={() => openPartialUsage(v)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm"
                        >
                          Partial Usage
                        </button>

                        <button
                          onClick={() => openEdit(v)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => shareWhatsApp(v)}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-sm"
                        >
                          Share
                        </button>

                        <button
                          onClick={() => remove(v.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-3 w-full h-2 bg-neutral-800 rounded-xl overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-sky-500 transition-[width] duration-300"
                      />
                    </div>

                    {/* Code / PIN */}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-neutral-300">
                      <div className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2">
                        <span className="text-neutral-500 mr-1">Code:</span>
                        {v.code || "-"}
                      </div>
                      <div className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2">
                        <span className="text-neutral-500 mr-1">PIN:</span>
                        {v.pin || "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Partial Usage */}
      {useItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl w-[90%] max-w-sm space-y-4">
            <h3 className="text-lg font-semibold">Partial Usage — {useItem.name}</h3>
            <div className="text-sm text-neutral-400">
              Remaining:{" "}
              {inr(Math.max(0, (useItem.value || 0) - (useItem.spent || 0)))}
            </div>
            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="Amount used"
              type="text"
              inputMode="decimal"
              value={useAmount}
              onChange={(e) => setUseAmount(cleanNumString(e.target.value))}
            />
            <div className="flex gap-3">
              <button
                onClick={savePartialUsage}
                className="flex-1 bg-sky-600 hover:bg-sky-500 py-2 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setUseItem(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Voucher */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-2xl w-[90%] max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Edit — {editItem.name}</h3>

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="Name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="Value"
              type="text"
              inputMode="decimal"
              value={editForm.value}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  value: cleanNumString(e.target.value),
                }))
              }
            />

            <select
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              value={editForm.category}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="Code (optional)"
              value={editForm.code}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, code: e.target.value }))
              }
            />

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="PIN (optional)"
              value={editForm.pin}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, pin: e.target.value }))
              }
            />

            <input
              className="rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
              type="date"
              value={editForm.expires_on}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, expires_on: e.target.value }))
              }
            />

            <div className="flex gap-3">
              <button
                onClick={saveEdit}
                className="flex-1 bg-sky-600 hover:bg-sky-500 py-2 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setEditItem(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
