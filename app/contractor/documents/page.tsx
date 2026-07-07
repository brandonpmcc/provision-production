export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { FileText, AlertCircle, Mail } from "lucide-react";

const DOCS = [
  { name: "Workers' Compensation", desc: "Current workers' comp insurance certificate" },
  { name: "Liability Insurance", desc: "General liability insurance coverage" },
  { name: "W-9 Form", desc: "Tax identification form" },
  { name: "Driver's License", desc: "Valid state-issued ID for lead crew member" },
];

export default async function ContractorDocumentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "contractor") redirect("/contractor-login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-provision-charcoal-dark">Compliance Documents</h1>
        <p className="text-sm text-provision-gray-text">Required documentation for your crew</p>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">To submit documents:</p>
          <p>Email all documents to <a href="mailto:mirian@provisionpaints.com" className="font-semibold underline">mirian@provisionpaints.com</a> with your crew name.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOCS.map((doc) => (
          <div key={doc.name} className="card">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-provision-gray flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-provision-gray-text" />
              </div>
              <div>
                <h3 className="font-semibold text-provision-charcoal-dark text-sm">{doc.name}</h3>
                <p className="text-xs text-provision-gray-text">{doc.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-50 text-xs font-medium text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Not on file — email to submit
            </div>
          </div>
        ))}
      </div>

      <div className="card bg-provision-orange-light border-provision-orange/30">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-provision-orange-dark shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-provision-charcoal-dark text-sm mb-1">Submit Your Documents</p>
            <p className="text-xs text-provision-gray-text mb-3">Send as email attachments to Miriam with your crew name in the subject line.</p>
            <a href="mailto:mirian@provisionpaints.com?subject=Crew%20Documentation" 
               className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-provision-orange text-white text-xs font-semibold hover:bg-provision-orange-dark transition">
              <Mail className="w-3.5 h-3.5" /> Email Miriam
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
