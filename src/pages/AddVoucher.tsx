import { useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function AddVoucher() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("vouchers").insert({
      user_id: user.id,
      name,
      value: Number(value),
      code,
      pin,
      expiry,
      status: "unused",
      spent: 0,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
      <div className="bg-white shadow-lg p-8 rounded-lg w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Add Voucher</h1>

        {error && (
          <p className="bg-red-100 text-red-600 p-2 rounded mb-4 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block font-medium mb-1">Voucher Name</label>
            <input
              className="w-full p-2 border rounded"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amazon, Flipkart, Nykaa etc"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Value (₹)</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="500, 1000, 2000"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Code</label>
            <input
              className="w-full p-2 border rounded"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Voucher code"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">PIN</label>
            <input
              className="w-full p-2 border rounded"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN (optional)"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Expiry Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold"
          >
            {loading ? "Saving..." : "Save Voucher"}
          </button>
        </form>
      </div>
    </div>
  );
}
