import { FormEvent, useState } from "react";
import { supabase } from "../supabase";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const nav = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    if (error) {
      setMsg(error.message);
      return;
    }
    // with email confirm OFF, user is signed up immediately
    nav("/dashboard", { replace: true });
  }

  return (
    <div className="min-h-[70vh] grid place-items-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl"
      >
        <h1 className="text-xl font-semibold mb-4">Create account</h1>
        <label className="block mb-3">
          <span className="text-sm text-neutral-300">Email</span>
          <input
            className="mt-1 w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 outline-none focus:ring-2 focus:ring-sky-500"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block mb-4">
          <span className="text-sm text-neutral-300">Password</span>
          <input
            className="mt-1 w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 outline-none focus:ring-2 focus:ring-sky-500"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
          />
        </label>
        {msg && <p className="text-red-400 text-sm mb-3">{msg}</p>}
        <button className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 transition">
          Sign up
        </button>
        <p className="text-sm text-neutral-400 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-sky-400 underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
