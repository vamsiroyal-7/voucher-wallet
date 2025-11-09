import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import type { Voucher } from "../types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Expiry-aware status (same logic as Vouchers.tsx)
  function deriveStatus(v: Voucher): "unused" | "used" | "expired" {
    if (v.expires_on) {
      const end = new Date(v.expires_on);
      end.setHours(23, 59, 59, 999);
      if (end.getTime() < Date.now()) return "expired";
    }
    return v.status as "unused" | "used" | "expired";
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (!error && data) setVouchers(data as Voucher[]);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, []);

  // ✅ Correct status counts using deriveStatus
  const totals = useMemo(() => {
    const totalValue = vouchers.reduce((a, v) => a + (v.value || 0), 0);
    const totalSpent = vouchers.reduce((a, v) => a + (v.spent || 0), 0);
    const totalRem = totalValue - totalSpent;

    const unused = vouchers.filter(v => deriveStatus(v) === "unused").length;
    const used = vouchers.filter(v => deriveStatus(v) === "used").length;
    const expired = vouchers.filter(v => deriveStatus(v) === "expired").length;

    return { totalValue, totalSpent, totalRem, unused, used, expired };
  }, [vouchers]);

  // ✅ Pie chart uses corrected counts
  const pieData = [
    { name: "Unused", value: totals.unused },
    { name: "Used", value: totals.used },
    { name: "Expired", value: totals.expired },
  ];

  // Let Recharts assign default colors automatically (as per your earlier rule)
  // COLORS kept only for fallback
  const COLORS = ["#22c55e", "#60a5fa", "#f43f5e"];

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Value" value={`₹ ${totals.totalValue.toFixed(2)}`} />
        <StatCard title="Total Spent" value={`₹ ${totals.totalSpent.toFixed(2)}`} />
        <StatCard title="Remaining" value={`₹ ${totals.totalRem.toFixed(2)}`} />
      </div>

      {/* Middle row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chart */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="mb-2 font-semibold">Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <h3 className="mb-2 font-semibold">Quick Actions</h3>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/vouchers"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500"
            >
              Manage Vouchers
            </Link>
          </div>

          <div className="mt-4 text-sm text-neutral-400">
            You have {vouchers.length} vouchers. Unused: {totals.unused}, Used: {totals.used}, Expired: {totals.expired}.
          </div>
        </div>
      </div>

      {/* Recent vouchers */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="mb-3 font-semibold">Recent Vouchers</h3>

        {loading ? (
          <div className="animate-pulse text-neutral-400">Loading…</div>
        ) : vouchers.length === 0 ? (
          <div className="text-neutral-400">No vouchers yet. Add some from the Vouchers page.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-300">
                <tr>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Value</th>
                  <th className="text-left py-2">Spent</th>
                  <th className="text-left py-2">Remaining</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Expiry</th>
                </tr>
              </thead>

              <tbody>
                {vouchers.slice(0, 8).map(v => {
                  const status = deriveStatus(v);
                  const remaining = (v.value || 0) - (v.spent || 0);

                  return (
                    <tr key={v.id} className="border-t border-neutral-800">
                      <td className="py-2">{v.name}</td>
                      <td className="py-2">₹ {v.value?.toFixed(2)}</td>
                      <td className="py-2">₹ {v.spent?.toFixed(2)}</td>
                      <td className="py-2">₹ {remaining.toFixed(2)}</td>

                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-lg text-xs ${badge(status)}`}>
                          {status}
                        </span>
                      </td>

                      <td className="py-2">
                        {v.expires_on ? new Date(v.expires_on).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
      <div className="text-neutral-400 text-sm">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

// ✅ Updated badge uses deriveStatus
function badge(status: string) {
  if (status === "unused")
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
  if (status === "used")
    return "bg-sky-500/15 text-sky-300 border border-sky-500/30";
  return "bg-rose-500/15 text-rose-300 border border-rose-500/30";
}
