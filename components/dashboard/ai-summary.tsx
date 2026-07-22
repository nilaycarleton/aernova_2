"use client";

import { useState } from "react";

export function AiSummary({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/ai`, {
      method: "POST",
      body: JSON.stringify({
        action: "summarize_project",
      }),
    });

    const data = await res.json();

    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-hairline bg-surface-raised p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink-primary">
          AI Project Summary
        </h3>

        <button
          onClick={generateSummary}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-ink-primary hover:bg-signal-blue"
        >
          {loading ? "Generating..." : "Generate Summary"}
        </button>
      </div>

      {summary && (
        <p className="text-ink-secondary leading-6">
          {summary}
        </p>
      )}
    </div>
  );
}