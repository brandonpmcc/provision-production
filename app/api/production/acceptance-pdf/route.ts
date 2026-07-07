import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const jobName    = p.get("name") || "Customer";
  const address    = p.get("address") || "—";
  const crewName   = p.get("crew") || "—";
  const pmName     = p.get("pm") || "—";
  const startDate  = p.get("startDate") || "—";
  const endDate    = p.get("endDate") || "—";
  const value      = p.get("value") ? `$${Number(p.get("value")).toLocaleString()}` : "—";
  const hours      = p.get("hours") || "—";
  const matBudget  = p.get("materialBudget") ? `$${Number(p.get("materialBudget")).toLocaleString()}` : "—";
  const notes      = p.get("notes") || "";
  const today      = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Job Acceptance — ${jobName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #101820; background: white; padding: 48px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 4px solid #D14124; }
  .brand { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #101820; }
  .brand span { color: #D14124; }
  .doc-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280; margin-top: 4px; }
  .date { font-size: 12px; color: #6B7280; text-align: right; }
  h2 { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #101820; margin-bottom: 16px; }
  .section { margin-bottom: 28px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .field { margin-bottom: 12px; }
  .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #6B7280; margin-bottom: 4px; }
  .field-value { font-size: 14px; font-weight: 600; color: #101820; }
  .highlight { background: #fff3e8; border-left: 4px solid #D14124; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px; }
  .highlight .field-value { font-size: 20px; font-weight: 900; color: #D14124; }
  .agreement { background: #f4f6f8; border-radius: 12px; padding: 20px; margin: 24px 0; }
  .agreement p { font-size: 13px; line-height: 1.7; color: #131E29; margin-bottom: 8px; }
  .sig-area { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-block { border-top: 2px solid #101820; padding-top: 8px; }
  .sig-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; text-align: center; }
  .teal-bar { height: 4px; background: #05C3DE; border-radius: 2px; margin: 20px 0; }
  @media print {
    body { padding: 32px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Pro<span>-</span>Vision<span> Painting</span></div>
      <div class="doc-title">Subcontractor Job Acceptance Document</div>
    </div>
    <div class="date">
      <div style="font-weight:700;font-size:13px;">Document Date</div>
      <div>${today}</div>
    </div>
  </div>

  <div class="section">
    <h2>Job Details</h2>
    <div class="highlight">
      <div class="field-label">Customer / Job</div>
      <div class="field-value">${jobName}</div>
    </div>
    <div class="grid">
      <div class="field"><div class="field-label">Job Address</div><div class="field-value">${address}</div></div>
      <div class="field"><div class="field-label">Project Manager</div><div class="field-value">${pmName}</div></div>
      <div class="field"><div class="field-label">Assigned Subcontractor</div><div class="field-value">${crewName}</div></div>
      <div class="field"><div class="field-label">Job Value</div><div class="field-value">${value}</div></div>
      <div class="field"><div class="field-label">Start Date</div><div class="field-value" style="color:#D14124;font-weight:900;">${startDate}</div></div>
      <div class="field"><div class="field-label">Est. Completion Date</div><div class="field-value">${endDate}</div></div>
      <div class="field"><div class="field-label">Budgeted Labor Hours</div><div class="field-value">${hours}h</div></div>
      <div class="field"><div class="field-label">Material Budget</div><div class="field-value">${matBudget}</div></div>
    </div>
    ${notes ? `<div class="field" style="margin-top:16px;"><div class="field-label">Special Notes / Instructions</div><div class="field-value" style="font-size:13px;font-weight:400;line-height:1.6;padding:12px;background:#f4f6f8;border-radius:8px;">${notes}</div></div>` : ""}
  </div>

  <div class="teal-bar"></div>

  <div class="section">
    <h2>Agreement</h2>
    <div class="agreement">
      <p>By signing below, the subcontractor agrees to the following:</p>
      <p>1. I accept this job assignment and agree to complete the described scope of work at the above address.</p>
      <p>2. I confirm the scheduled start date of <strong>${startDate}</strong> and commit to arriving on time.</p>
      <p>3. I agree to complete the job within the budgeted hours of <strong>${hours} hours</strong> unless a change order is approved by the Project Manager.</p>
      <p>4. I agree to maintain a clean job site, follow Pro-Vision Painting quality standards, and communicate with the PM regarding any issues.</p>
      <p>5. I understand that final payment is contingent upon PM approval of completed work.</p>
    </div>
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div style="height:56px;"></div>
      <div class="sig-label">Subcontractor Signature</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:4px;">${crewName}</div>
    </div>
    <div class="sig-block">
      <div style="height:56px;"></div>
      <div class="sig-label">Date Signed</div>
    </div>
  </div>

  <div style="margin-top:32px;" class="sig-area">
    <div class="sig-block">
      <div style="height:56px;"></div>
      <div class="sig-label">Pro-Vision PM Signature</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:4px;">${pmName}</div>
    </div>
    <div class="sig-block">
      <div style="height:56px;"></div>
      <div class="sig-label">Date</div>
    </div>
  </div>

  <div class="footer">
    Pro-Vision Painting &amp; Home Improvement · Jacksonville, FL · 904-528-1471 · provisionpaints.com
    <br>This document was generated by the Pro-Vision Production Management System
  </div>

  <div class="no-print" style="margin-top:32px;text-align:center;">
    <button onclick="window.print()" style="background:#D14124;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
