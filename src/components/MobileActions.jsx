import React, { useState } from "react";
import { FiPlus, FiX, FiImage, FiCamera, FiHelpCircle, FiCheckSquare } from "react-icons/fi";

/**
 * MobileActions
 * Floating action button for small screens.
 * Assistant action intentionally removed (header-only now).
 */
export default function MobileActions({
  onUpload,
  onCamera,
  onGuide,
  autoIndent = true,
  setAutoIndent = () => {},
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const handle = (fn) => () => {
    if (disabled) return;
    close();
    fn?.();
  };

  return (
    <div className="ma-root" aria-hidden={disabled}>
      {/* Backdrop when open */}
      {open && <div className="ma-backdrop" onClick={close} />}

      {/* Actions panel */}
      <div className={`ma-panel ${open ? "open" : ""}`}>
        <button
          className="ma-btn"
          onClick={handle(onUpload)}
          disabled={disabled}
          aria-label="Upload"
        >
          <FiImage />
          <span>Upload</span>
        </button>

        <button
          className="ma-btn"
          onClick={handle(onCamera)}
          disabled={disabled}
          aria-label="Camera"
        >
          <FiCamera />
          <span>Camera</span>
        </button>

        <button
          className="ma-btn"
          onClick={handle(onGuide)}
          disabled={disabled}
          aria-label="Guide me"
        >
          <FiHelpCircle />
          <span>Guide</span>
        </button>

        <button
          className={`ma-btn toggle ${autoIndent ? "on" : ""}`}
          onClick={() => !disabled && setAutoIndent(!autoIndent)}
          disabled={disabled}
          aria-pressed={autoIndent}
          aria-label="Toggle auto-indent"
        >
          <FiCheckSquare />
          <span>Auto-indent</span>
        </button>
      </div>

      {/* FAB */}
      <button
        className="ma-fab"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-label={open ? "Close actions" : "Open actions"}
      >
        {open ? <FiX /> : <FiPlus />}
      </button>

      {/* Scoped styles */}
      <style>{`
        .ma-root { position: fixed; right: 18px; bottom: 18px; z-index: 120; }
        @media (min-width: 900px){ .ma-root { display:none } }

        .ma-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,.25);
          backdrop-filter: blur(1px);
        }

        .ma-fab {
          width: 54px; height: 54px; border-radius: 50%;
          display: grid; place-items: center;
          border: 1px solid rgba(255,255,255,.18);
          background: linear-gradient(135deg, #22d3ee, #7dd3fc);
          color: #0a1220; font-size: 24px; cursor: pointer;
          box-shadow: 0 14px 34px rgba(0,0,0,.38);
        }
        .ma-fab:disabled { opacity:.6; cursor:not-allowed }

        .ma-panel {
          position: absolute; right: 0; bottom: 70px;
          display: grid; gap: 8px;
          padding: 10px;
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(20,26,33,.92), rgba(14,18,23,.96));
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 12px 30px rgba(0,0,0,.40);
          backdrop-filter: blur(14px) saturate(140%);
          transform: translateY(8px);
          opacity: 0; pointer-events: none;
          transition: opacity .16s ease, transform .16s ease;
          min-width: 170px;
        }
        .ma-panel.open { opacity:1; pointer-events:auto; transform: translateY(0) }

        .ma-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 10px;
          background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.06));
          border: 1px solid rgba(255,255,255,.16);
          color: #e7ecf3; font-size: 14px; cursor: pointer;
        }
        .ma-btn:hover { box-shadow: 0 8px 20px rgba(0,0,0,.25) }
        .ma-btn:disabled { opacity:.6; cursor: not-allowed }
        .ma-btn svg { font-size: 18px }

        .ma-btn.toggle.on {
          background: linear-gradient(180deg, rgba(125,211,252,.22), rgba(125,211,252,.12));
          border-color: rgba(125,211,252,.45);
        }
      `}</style>
    </div>
  );
}
