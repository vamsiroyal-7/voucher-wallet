import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useEffect, useState } from "react";

export default function TopBar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const linkBase =
    "px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors";
  const active =
    "bg-neutral-800 text-white";
  const inactive =
    "text-neutral-300";

  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-neutral-900/70 border-b border-neutral-800">
      <div className="mx-auto max-w-6xl p-3 flex items-center justify-between">
        <Link to="/dashboard" className="font-semibold tracking-wide">
          Voucher<span className="text-sky-400">Wallet</span>
        </Link>
        <nav className="flex gap-2">
          <Link
            to="/dashboard"
            className={`${linkBase} ${loc.pathname === "/dashboard" ? active : inactive}`}
          >
            Dashboard
          </Link>
          <Link
            to="/vouchers"
            className={`${linkBase} ${loc.pathname === "/vouchers" ? active : inactive}`}
          >
            Vouchers
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {email ? (
            <>
              <span className="text-sm text-neutral-300">{email}</span>
              <button
                onClick={logout}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
