"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface CloseoutChecklistProps {
  productionId: string;
  jobName: string;
  existingNotes?: string | null;
  onClose: () => void;
}

const DEFAULT_CHECKLIST: Record<string, string> = {
  finalWalkthrough: "Final walkthrough completed",
  customerApproved: "Customer approved the work",
  touchupsComplete: "Touch-ups completed",
  companyCamPhotos: "CompanyCam photos uploaded",
  materialsChecked: "Materials inventory checked",
  leftoverMaterials: "Leftover materials handled",
  siteClean: "Job site cleaned up",
  invoiceConfirmed: "Final invoice/payment confirmed",
  reviewRequested: "5-star review requested from customer",
  subReviewed: "Subcontractor performance reviewed",
  budgetReviewed: "Budget vs actuals reviewed",
  hoursReviewed: "Hours vs estimate reviewed",
  readyToClose: "Job ready for closeout",
};

function parseChecklistFromNotes(notes: string | null | undefined): Record<string, ChecklistItem> {
  const checklist: Record<string, ChecklistItem> = {};

  // Initialize all items as unchecked
  for (const [key, label] of Object.entries(DEFAULT_CHECKLIST)) {
    checklist[key] = { label, done: false };
  }

  // Try to parse existing checklist from notes
  if (notes) {
    const match = notes.match(/\[CHECKLIST\](.*?)\[\/CHECKLIST\]/s);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        for (const [key, item] of Object.entries(parsed)) {
          if (key in checklist) {
            checklist[key] = { label: (item as any).label || DEFAULT_CHECKLIST[key], done: (item as any).done || false };
          }
        }
      } catch (e) {
        // Parsing failed, use defaults
      }
    }
  }

  return checklist;
}

export function CloseoutChecklist({
  productionId,
  jobName,
  existingNotes,
  onClose,
}: CloseoutChecklistProps) {
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem>>(() =>
    parseChecklistFromNotes(existingNotes)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedCount = Object.values(checklist).filter((item) => item.done).length;
  const totalCount = Object.keys(checklist).length;
  const isAllDone = completedCount === totalCount;

  const handleToggle = (key: string) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: { ...prev[key], done: !prev[key].done },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/production/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionId,
          checklist,
          existingNotes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save checklist");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error saving checklist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-provision-navy px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-white font-black text-lg uppercase tracking-tight">Closeout Checklist</h2>
            <p className="text-white/60 text-sm mt-1">{jobName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-provision-gray-text">Progress</span>
              <span className="text-sm font-bold text-provision-navy">{completedCount} of {totalCount}</span>
            </div>
            <div className="h-2 bg-provision-gray rounded-full overflow-hidden">
              <div
                className="h-full bg-provision-teal transition-all"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {/* All done banner */}
          {isAllDone && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-green-800">All Done — Ready to Close Out!</div>
                <div className="text-sm text-green-700">Save to mark this job complete.</div>
              </div>
            </div>
          )}

          {/* Checklist items */}
          <div className="space-y-2">
            {Object.entries(checklist).map(([key, item]) => (
              <label key={key} className="flex items-start gap-3 p-3 rounded-lg hover:bg-provision-gray transition-colors cursor-pointer group">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => handleToggle(key)}
                  className="w-5 h-5 rounded-md border-2 border-provision-teal checked:bg-provision-teal checked:border-provision-teal accent-provision-teal mt-0.5 cursor-pointer"
                />
                <span className={`flex-1 text-sm transition-all ${item.done ? "line-through text-provision-gray-text" : "text-provision-navy font-medium"}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-provision-gray-mid px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border-2 border-provision-gray-mid text-provision-navy font-bold uppercase tracking-wide text-sm hover:bg-provision-gray transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-provision-orange text-white font-bold uppercase tracking-wide text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : (
              "Save Progress"
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-t border-red-200 px-6 py-3 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
