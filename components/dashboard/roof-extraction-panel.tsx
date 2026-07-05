"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  prepareRoofExtractionAction,
  extractRoofFromMeshAction,
} from "@/app/(dashboard)/projects/[projectId]/phase-six-actions";
import type { PlanPreview, RoofExtractionSummary } from "@/lib/roof-extraction-types";

type ExtractionResult = RoofExtractionSummary;

type Point = { x: number; y: number };

export function RoofExtractionPanel({
  projectId,
  imageryId,
  modelLabel,
}: {
  projectId: string;
  imageryId: string;
  modelLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [polygon, setPolygon] = useState<Point[]>([]);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreview, startPreview] = useTransition();
  const [extracting, startExtract] = useTransition();

  const loadPreview = useCallback(() => {
    setError(null);
    setResult(null);
    setPolygon([]);
    startPreview(async () => {
      try {
        const data = await prepareRoofExtractionAction(projectId, imageryId);
        setPreview(data);
        // Seed the ROI with the auto-detected footprint so the operator only has
        // to confirm/adjust instead of outlining the roof from scratch.
        if (data.suggestedRoiPolygon && data.suggestedRoiPolygon.length >= 3) {
          setPolygon(data.suggestedRoiPolygon);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load the roof model preview");
      }
    });
  }, [projectId, imageryId]);

  // Paint the elevation raster and the in-progress ROI polygon onto the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bytes = Uint8Array.from(atob(preview.elevationGrid), (c) => c.charCodeAt(0));
    const image = ctx.createImageData(preview.width, preview.height);
    for (let i = 0; i < bytes.length; i++) {
      const v = bytes[i];
      const o = i * 4;
      if (v === 0) {
        // No-data / ground floor → deep slate.
        image.data[o] = 15;
        image.data[o + 1] = 23;
        image.data[o + 2] = 42;
      } else {
        // Elevation ramp: low = teal, high = warm white.
        image.data[o] = Math.min(255, 40 + v);
        image.data[o + 1] = Math.min(255, 90 + v * 0.6);
        image.data[o + 2] = Math.min(255, 140 + v * 0.4);
      }
      image.data[o + 3] = 255;
    }
    canvas.width = preview.width;
    canvas.height = preview.height;
    ctx.putImageData(image, 0, 0);

    if (polygon.length > 0) {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "#38bdf8";
      ctx.fillStyle = "rgba(56,189,248,0.18)";
      ctx.beginPath();
      polygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (polygon.length >= 3) ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      for (const p of polygon) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [preview, polygon]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;
    const rect = canvas.getBoundingClientRect();
    // Map the click from displayed (CSS) pixels to native grid pixels.
    const x = ((event.clientX - rect.left) / rect.width) * preview.width;
    const y = ((event.clientY - rect.top) / rect.height) * preview.height;
    setPolygon((prev) => [...prev, { x, y }]);
    setResult(null);
  };

  const toMeshPolygon = (pts: Point[]): { x: number; y: number }[] => {
    if (!preview) return [];
    const { bounds, width, height } = preview;
    return pts.map((p) => ({
      x: bounds.xMin + (p.x / width) * (bounds.xMax - bounds.xMin),
      // Row 0 of the raster is north (max Y).
      y: bounds.yMax - (p.y / height) * (bounds.yMax - bounds.yMin),
    }));
  };

  const runExtraction = () => {
    if (polygon.length < 3) {
      setError("Draw a box around the roof — tap at least three points to outline it.");
      return;
    }
    setError(null);
    const meshPolygon = toMeshPolygon(polygon);
    startExtract(async () => {
      try {
        const res = await extractRoofFromMeshAction(projectId, imageryId, meshPolygon);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Roof extraction failed");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-white">Measure your roof</h3>
        <p className="text-sm text-slate-400">
          Draw a box around the roof and we&apos;ll calculate the real area, slope, and number of
          squares — measured straight from the 3D model, not guessed.
        </p>
        <ol className="mt-1 grid gap-1 text-xs text-slate-400 sm:grid-cols-3">
          <li className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
            <span className="font-semibold text-sky-300">1.</span> Load the 3D roof
          </li>
          <li className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
            <span className="font-semibold text-sky-300">2.</span> Draw a box around the roof
          </li>
          <li className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
            <span className="font-semibold text-sky-300">3.</span> Get measurements — they save automatically
          </li>
        </ol>
        <p className="mt-1 text-xs text-slate-500">
          Your measurements save as roof sections you can edit below. Measuring again replaces them.
        </p>
      </div>

      {!preview && (
        <button
          type="button"
          onClick={loadPreview}
          disabled={loadingPreview}
          className="mt-4 rounded-xl border border-white/10 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-500/30 disabled:opacity-50"
        >
          {loadingPreview ? "Loading…" : "Load the 3D roof"}
        </button>
      )}

      {preview && (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full max-w-full cursor-crosshair rounded-2xl border border-white/10"
              style={{ imageRendering: "pixelated", aspectRatio: `${preview.width} / ${preview.height}` }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPolygon((p) => p.slice(0, -1))}
                disabled={polygon.length === 0 || extracting}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
              >
                Undo point
              </button>
              <button
                type="button"
                onClick={() => setPolygon([])}
                disabled={polygon.length === 0 || extracting}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
              >
                Clear region
              </button>
              <button
                type="button"
                onClick={runExtraction}
                disabled={polygon.length < 3 || extracting}
                className="rounded-lg border border-white/10 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-40"
              >
                {extracting ? "Measuring…" : "Measure roof"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {polygon.length} point{polygon.length === 1 ? "" : "s"} • elevation {preview.baseElevationM}m–
              {preview.topElevationM}m
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            {!result && !error && (
              <p className="text-sm text-slate-400">
                Draw a box around the roof, then measure. The results flow straight into your quote
                and report.
              </p>
            )}
            {error && <p className="text-sm text-rose-300">{error}</p>}
            {result && (
              <div className="space-y-3 text-sm text-slate-200">
                <p className="font-medium text-white">Measurements ready</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <dt className="text-slate-400">Roof faces</dt>
                  <dd className="text-right">{result.facetCount}</dd>
                  <dt className="text-slate-400">Surface area</dt>
                  <dd className="text-right">{result.totalSurfaceAreaSqft.toLocaleString()} ft²</dd>
                  <dt className="text-slate-400">Footprint</dt>
                  <dd className="text-right">{result.totalProjectedAreaSqft.toLocaleString()} ft²</dd>
                  <dt className="text-slate-400">Squares</dt>
                  <dd className="text-right">{result.roofSquares}</dd>
                  <dt className="text-slate-400">Main pitch</dt>
                  <dd className="text-right">{result.predominantPitchRatio}</dd>
                  <dt className="text-slate-400">Detail captured</dt>
                  <dd className="text-right">
                    {result.diagnostics.trianglesInRoi > 0
                      ? Math.round(
                          (result.diagnostics.trianglesSegmented / result.diagnostics.trianglesInRoi) * 100
                        )
                      : 0}
                    %
                  </dd>
                </dl>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Pitch breakdown</p>
                  <ul className="space-y-1">
                    {result.pitchBreakdown.slice(0, 5).map((row) => (
                      <li key={row.pitch} className="flex justify-between text-xs">
                        <span className="text-slate-300">{row.pitch}</span>
                        <span className="text-slate-400">
                          {row.areaSqft.toLocaleString()} ft² ({row.percent}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-slate-500">
                  {result.sectionsCreated} roof sections saved · {result.diagnostics.trianglesSegmented.toLocaleString()} of{" "}
                  {result.diagnostics.trianglesInRoi.toLocaleString()} mesh triangles in region segmented
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
