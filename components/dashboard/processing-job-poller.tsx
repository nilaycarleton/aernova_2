"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  projectId: string;
  activeJobs: number;
};

export function ProcessingJobPoller({ projectId, activeJobs }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (activeJobs <= 0) return;

    let cancelled = false;
    const sync = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/processing/sync`, {
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
  }, [activeJobs, projectId, router]);

  return null;
}
