import React, { useEffect, useRef, useState } from "react";

const clampPct = (v) => Math.max(0, Math.min(100, Number.isFinite(+v) ? +v : 0));

function MetricRow({ label, value, help }) {
  const known = Number.isFinite(value);
  const pct = clampPct(value);
  return (
    <div className="ocrm-row" title={help || ""}>
      <div className="ocrm-label">{label}</div>
      <div className="ocrm-bar">
        <div className={`ocrm-fill ${known ? "" : "unknown"}`} style={known ? { width: `${pct}%` } : undefined} />
      </div>
      <div className="ocrm-val">{known ? `${pct}%` : "N/A"}</div>
    </div>
  );
}

/**
 * Props:
 * - score: number 0..100
 * - status: string (engine/source label, e.g. "Google Vision")
 * - phase: "Idle" | "Uploading" | "Processing"
 * - uploadPct: number 0..100 (used when phase === "Uploading")
 * - error: string (non-empty => error mode)
 * - metrics: { sharpness, contrast, lighting, skew, noise, textCoverage, langConfidence } // each 0..100 or null
 */
export default function OcrAccuracyCard({
  score = 0,
  status = "Estimated from word confidences",
  phase = "Idle",
  uploadPct = 0,
  error = "",
  metrics = {},
}) {
  const pct = clampPct(score);
  const loading = phase !== "Idle" && !error;

  const [showDetails, setShowDetails] = useState(false);
  const popRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!showDetails) return;
      if (popRef.current && !popRef.current.contains(e.target)) setShowDetails(false);
    };
    const onEsc = (e) => e.key === "Escape" && setShowDetails(false);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [showDetails]);

  return (
    <div className={"ocr-card glass" + (error ? " danger" : "")}>
      {/* Header */}
      <div className="ocr-head ocr-row">
        <span className="ocr-title">OCR Accuracy</span>
        <span className={"ocr-badge" + (error ? " danger" : "")}>
          {error ? "Error" : `${pct}%`}
        </span>
      </div>

      {/* Sub / status */}
      <div className="ocr-sub">
        {error
          ? error
          : loading
          ? (phase === "Uploading" ? `Uploading… ${clampPct(uploadPct)}%` : "Processing…")
          : status}
      </div>

      {/* Progress bar */}
      <div className={"ocr-bar" + (loading ? " indeterminate" : "")}>
        {!loading && <div className="ocr-bar-fill" style={{ width: `${pct}%` }} />}
        {loading && <div className="ocr-bar-fill" />}
      </div>

      {/* Footer actions */}
      {!error && (
        <div className="ocr-actions">
          <button
            className="btn ghost small"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            aria-controls="ocr-details-pop"
            disabled={loading}
            title="How is accuracy estimated?"
          >
            Details
          </button>
        </div>
      )}

      {/* Pop details */}
      {showDetails && !error && (
        <div id="ocr-details-pop" className="ocr-pop glass-pop" ref={popRef}>
          <div className="ocr-pop-title">How we estimate accuracy</div>
          <div className="ocr-pop-sub">Higher is better • 0–100</div>

          <MetricRow label="Sharpness"       value={metrics.sharpness}      help="Edge clarity / focus." />
          <MetricRow label="Contrast"        value={metrics.contrast}       help="Separation of text vs background." />
          <MetricRow label="Lighting"        value={metrics.lighting}       help="Uniform exposure without glare/shadow." />
          <MetricRow label="Skew/Rotation"   value={metrics.skew}           help="Alignment / deskew quality." />
          <MetricRow label="Noise Removal"   value={metrics.noise}          help="Artifacts/compression cleaned before OCR." />
          <MetricRow label="Text Coverage"   value={metrics.textCoverage}   help="Portion of image that contains text." />
          <MetricRow label="Language Conf."  value={metrics.langConfidence} help="Engine confidence in language/script." />

          <div className="ocr-pop-note">
            If a metric shows <em>N/A</em>, the engine didn’t provide it.
          </div>
        </div>
      )}
    </div>
  );
}
