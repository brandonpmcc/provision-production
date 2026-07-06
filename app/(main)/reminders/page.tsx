export const dynamic = "force-dynamic";
import { getProductionJobs, getDealContactIds, getContactsByIds } from "@/lib/airtable";
import { Bell, CheckCircle, Clock, AlertCircle, Phone, Mail } from "lucide-react";
import { MarkReminderButton } from "@/components/MarkReminderButton";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / 86_400_000);
}

function fmtPhone(p: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  return p;
}

type ReminderType = "14day" | "7day" | "3day" | "1day";

const INTERVALS: { type: ReminderType; days: number; label: string; window: number }[] = [
  { type: "14day", days: 14, label: "14-Day", window: 2 },
  { type: "7day",  days: 7,  label: "7-Day",  window: 1 },
  { type: "3day",  days: 3,  label: "3-Day",  window: 1 },
  { type: "1day",  days: 1,  label: "1-Day",  window: 1 },
];

export default async function RemindersPage() {
  const jobs = await getProductionJobs().catch(() => []);
  const jobsWithDates = jobs.filter((j) => j.startDate);

  const dealIds = [...new Set(jobsWithDates.map((j) => j.dealId).filter((id): id is string => Boolean(id)))];
  const dealContactMap = await getDealContactIds(dealIds).catch(() => new Map<string, string>());
  const contactIds = [...new Set([...dealContactMap.values()])];
  const contacts = await getContactsByIds(contactIds).catch(() => []);
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const jobContact = new Map<string, typeof contacts[number]>();
  for (const j of jobsWithDates) {
    if (!j.dealId) continue;
    const cid = dealContactMap.get(j.dealId);
    if (cid) { const c = contactById.get(cid); if (c) jobContact.set(j.id, c); }
  }

  type Action = {
    job: typeof jobs[number]; type: ReminderType; label: string;
    daysUntilStart: number; alreadySent: boolean; sentDate: string | null;
    contact: typeof contacts[number] | null;
  };

  const actions: Action[] = [];
  for (const j of jobsWithDates) {
    const days = daysUntil(j.startDate);
    if (days == null || days < -1 || days > 16) continue;
    for (const interval of INTERVALS) {
      if (!(days >= interval.days - interval.window && days <= interval.days)) continue;
      const sentDate =
        interval.type === "14day" ? j.reminder14daySent :
        interval.type === "7day"  ? j.reminder7daySent  :
        interval.type === "3day"  ? j.reminder3daySent  : j.reminder1daySent;
      actions.push({
        job: j, type: interval.type, label: interval.label, daysUntilStart: days,
        alreadySent: !!sentDate, sentDate: sentDate ?? null,
        contact: jobContact.get(j.id) ?? null,
      });
    }
  }
  actions.sort((a, b) => (a.alreadySent !== b.alreadySent ? (a.alreadySent ? 1 : -1) : a.daysUntilStart - b.daysUntilStart));

  const due  = actions.filter((a) => !a.alreadySent);
  const done = actions.filter((a) =>  a.alreadySent);
  const upcoming = jobsWithDates
    .map((j) => ({ job: j, days: daysUntil(j.startDate)!, contact: jobContact.get(j.id) ?? null }))
    .filter((x) => x.days >= -1 && x.days <= 14)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-provision-charcoal-dark">Reminders</h1>
        <p className="text-sm text-provision-gray-text">
          Customer &amp; crew confirmation reminders · auto-queued by start date
        </p>
      </div>

      <section>
        <h2 className="font-semibold text-provision-charcoal-dark mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-provision-orange-dark" />
          Reminders due now
          {due.length > 0 && (
            <span className="ml-1 bg-provision-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">{due.length}</span>
          )}
        </h2>
        {due.length === 0 ? (
          <div className="card text-sm text-provision-gray-text text-center py-6 flex flex-col items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500" />
            All caught up — no reminders due right now.
          </div>
        ) : (
          <div className="space-y-2">
            {due.map((a) => {
              const phone = fmtPhone(a.contact?.phone ?? null);
              const email = a.contact?.email ?? null;
              const urgency = a.daysUntilStart <= 1 ? "border-red-300 bg-red-50/40" : a.daysUntilStart <= 3 ? "border-orange-300 bg-orange-50/40" : "border-provision-gray-mid bg-white";
              return (
                <div key={`${a.job.id}-${a.type}`} className={`card border ${urgency}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-provision-charcoal-dark">{a.job.job}</span>
                        <span className={`pill text-[10px] shrink-0 ${a.daysUntilStart <= 1 ? "bg-red-100 text-red-700" : a.daysUntilStart <= 3 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                          {a.label} reminder
                        </span>
                        <span className="text-xs text-provision-gray-text">
                          starts <span className="font-medium text-provision-charcoal-dark">
                            {a.daysUntilStart === 0 ? "today" : a.daysUntilStart === 1 ? "tomorrow" : `in ${a.daysUntilStart} days`}
                          </span> ({a.job.startDate})
                        </span>
                      </div>
                      <div className="text-xs text-provision-gray-text mb-2 flex flex-wrap gap-x-3">
                        {a.job.crew ? <span>Crew: <span className="text-provision-charcoal-dark">{a.job.crew}</span></span> : <span className="text-yellow-600">No crew assigned</span>}
                        <span className={a.job.customerConfirmedStart ? "text-green-600" : "text-yellow-600"}>
                          {a.job.customerConfirmedStart ? "✓ Customer confirmed" : "○ Customer not confirmed"}
                        </span>
                        <span className={a.job.crewConfirmed ? "text-green-600" : "text-yellow-600"}>
                          {a.job.crewConfirmed ? "✓ Crew confirmed" : "○ Crew not confirmed"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {a.contact?.name && <span className="text-provision-gray-text font-medium">{a.contact.name}</span>}
                        {phone && (
                          <a href={`tel:${a.contact?.phone}`} className="flex items-center gap-1 text-provision-orange-dark hover:underline font-medium">
                            <Phone className="w-3 h-3" />{phone}
                          </a>
                        )}
                        {email && (
                          <a href={`mailto:${email}`} className="flex items-center gap-1 text-provision-orange-dark hover:underline font-medium">
                            <Mail className="w-3 h-3" />{email}
                          </a>
                        )}
                        {!phone && !email && <span className="text-provision-gray-text italic">No contact info on file</span>}
                      </div>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <MarkReminderButton jobId={a.job.id} type={a.type} label={a.label} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="font-semibold text-provision-charcoal-dark mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />Already sent ({done.length})
          </h2>
          <div className="card divide-y divide-provision-gray-mid">
            {done.map((a) => (
              <div key={`${a.job.id}-${a.type}`} className="flex items-center justify-between py-2 gap-4">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-provision-charcoal-dark">{a.job.job}</span>
                  <span className="ml-2 text-xs text-provision-gray-text">{a.label} · sent {a.sentDate}</span>
                </div>
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-provision-charcoal-dark mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-provision-gray-text" />
          Upcoming starts — next 14 days ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="card text-sm text-provision-gray-text italic">No jobs starting in the next two weeks. Set start dates in the Pipeline.</div>
        ) : (
          <div className="card divide-y divide-provision-gray-mid">
            {upcoming.map(({ job: j, days, contact }) => {
              const phone = fmtPhone(contact?.phone ?? null);
              return (
                <div key={j.id} className="flex items-center gap-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-provision-charcoal-dark">{j.job}</div>
                    <div className="text-xs text-provision-gray-text mt-0.5 flex flex-wrap gap-x-3">
                      <span>{j.crew || "no crew"}</span>
                      <span className={j.customerConfirmedStart ? "text-green-600" : "text-yellow-600"}>{j.customerConfirmedStart ? "✓ customer" : "○ customer"}</span>
                      <span className={j.crewConfirmed ? "text-green-600" : "text-yellow-600"}>{j.crewConfirmed ? "✓ crew" : "○ crew"}</span>
                      {phone && <a href={`tel:${contact?.phone}`} className="text-provision-orange-dark hover:underline flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{phone}</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(!j.customerConfirmedStart || !j.crewConfirmed) && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                    <div className="text-right">
                      <div className={`font-semibold text-sm ${days <= 0 ? "text-red-600" : days <= 3 ? "text-orange-600" : "text-provision-charcoal-dark"}`}>
                        {days === 0 ? "Today" : days === -1 ? "Yesterday" : days === 1 ? "Tomorrow" : `${days}d`}
                      </div>
                      <div className="text-xs text-provision-gray-text">{j.startDate}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
