export default function SettingsPage() {
  const env = {
    "Airtable token": !!process.env.AIRTABLE_TOKEN,
    "CompanyCam token": !!process.env.COMPANYCAM_TOKEN,
    "Google OAuth": !!process.env.GOOGLE_CLIENT_ID,
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-provision-charcoal-dark">Settings</h1>
        <p className="text-sm text-provision-gray-text">Integrations & configuration</p>
      </div>
      <section className="card">
        <h2 className="font-semibold text-provision-charcoal-dark mb-3">Integration status</h2>
        <div className="space-y-2">
          {Object.entries(env).map(([k, ok]) => (
            <div key={k} className="flex items-center justify-between text-sm">
              <div>{k}</div>
              <span
                className={`pill ${
                  ok
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {ok ? "Connected" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
