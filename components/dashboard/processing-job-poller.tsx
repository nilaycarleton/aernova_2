"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  jobId: string;
  activeJobs: number;
};

export function ProcessingJobPoller({ jobId, activeJobs }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (activeJobs <= 0) return;

    let cancelled = false;
    const sync = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/processing/sync`, {
          method: "POST",
        });
        if (!cancelled && response.ok) router.refresh();
      } catch {
        // Keep polling quietly; worker health is shown elsewhere in the UI.
      }
    };
    const interval = window.setInterval(sync, 10000);
    void sync();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobs, jobId, router]);

  return null;
}
