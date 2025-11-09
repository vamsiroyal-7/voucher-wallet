export default function Home() {
  return (
    <div className="animate-fadeInSlow max-w-4xl mx-auto p-6">

      {/* Glass Hero Card */}
      <div className="card-glass p-8 mb-10 animate-fadeInUp">
        <h1 className="text-3xl font-bold mb-3">Voucher Wallet</h1>
        <p className="text-neutral-400 text-lg">
          Track your gift vouchers, partial usage, expiry status, share via WhatsApp,
          import/export in Excel, filter by category and more.
        </p>

        <button className="btn btn-primary mt-6">
          Get Started →
        </button>
      </div>

      {/* Three feature cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card-glass p-6 animate-fadeInUp">
          <div className="text-3xl mb-3">🎁</div>
          <h2 className="font-semibold text-xl mb-1">Add Vouchers</h2>
          <p className="text-neutral-400 text-sm">
            Save value, expiry date, category, PIN, and more.
          </p>
        </div>

        <div className="card-glass p-6 animate-fadeInUp">
          <div className="text-3xl mb-3">📊</div>
          <h2 className="font-semibold text-xl mb-1">Track Usage</h2>
          <p className="text-neutral-400 text-sm">
            Partial spending tracking with automatic status update.
          </p>
        </div>

        <div className="card-glass p-6 animate-fadeInUp">
          <div className="text-3xl mb-3">📤</div>
          <h2 className="font-semibold text-xl mb-1">Export & Share</h2>
          <p className="text-neutral-400 text-sm">
            Export to Excel or share details directly through WhatsApp.
          </p>
        </div>
      </div>

    </div>
  );
}
