"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { markReminderSent } from "@/app/actions";

interface Props {
  jobId: string;
  type: "14day" | "7day" | "3day" | "1day";
  label: string;
}

export function MarkReminderButton({ jobId, type, label }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  function handleClick() {
    setError(false);
    startTransition(async () => {
      try {
        await markReminderSent(jobId, type);
        setDone(true);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  }

  if (done) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle className="w-3.5 h-3.5" /> Sent
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-provision-orange text-white hover:bg-provision-orange-dark transition disabled:opacity-60"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        Mark {label} sent
      </button>
      {error && <span className="text-[10px] text-red-500">Failed — try again</span>}
    </div>
  );
}
