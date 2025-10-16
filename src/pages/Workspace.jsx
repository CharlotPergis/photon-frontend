// src/pages/Workspace.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { FiPlay, FiZap, FiUpload, FiCamera, FiHome, FiLogOut, FiMenu, FiX, FiCrop } from "react-icons/fi";
import TerminalView from "../components/Terminal.jsx";
import { socket } from "../socket";
import "./Workspace.css";
import MascotGuideButton from "../tour/MascotGuideButton";
import { buildStep, useMascotTour } from "../tour/useMascotTour";
import "../tour/mascot.css";
import ImageCropper from "./ImageCropper";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const esc = (s) => String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function mergePromptAndInput(prevOut, promptText, userText) {
  const prev = String(prevOut ?? "");
  const prompt = String(promptText ?? "");
  const user = String(userText ?? "").replace(/\n+$/, "");
  if (!user) return prev;
  if (prompt) {
    const reTailPrompt = new RegExp(`(?:^|\\n)${esc(prompt)}\\s*$`);
    if (reTailPrompt.test(prev)) {
      return prev.replace(reTailPrompt, (m) => m.replace(/\s*$/, "") + ` ${user}\n`);
    }
  }
  return prev + (prompt ? `${prompt} ${user}\n` : `${user}\n`);
}

// Enhanced OCR feedback component with specific advice
const OCRFeedbackPanel = ({ accuracy, qualityFeedback, overallReadability, ocrLoading, ocrTips }) => {
  if (ocrLoading) return null;
  if (!qualityFeedback || qualityFeedback.length === 0) return null;

  return (
    <div className="ocr-feedback-panel">
      <div className="ocr-header">
        <h4>Image Quality Report</h4>
        <div className="accuracy-badge">
          <span className="accuracy-value">{accuracy}% Accuracy</span>
        </div>
      </div>

      {qualityFeedback.map((feedback, index) => (
        <div key={index} className="file-feedback">
          <div className="file-name">📄 {feedback.filename}</div>
          
          {/* Overall Quality Summary */}
          {feedback.image_quality?.quality_summary && (
            <div className="quality-summary">
              {feedback.image_quality.quality_summary}
            </div>
          )}

          {/* Quick Fixes */}
          {feedback.image_quality?.quick_fixes && (
            <div className="quick-fixes-section">
              <div className="section-title">🚀 Quick Improvements:</div>
              <ul className="suggestions-list">
                {feedback.image_quality.quick_fixes.map((fix, idx) => (
                  <li key={idx}>{fix}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Image Quality Metrics */}
          {feedback.image_quality && feedback.image_quality.analysis_available && (
            <div className="image-quality-section">
              <div className="section-title">📊 Image Analysis:</div>
              <div className="quality-metrics">
                {feedback.image_quality.brightness_score !== undefined && (
                  <div className="metric">
                    <span className="metric-label">Brightness:</span>
                    <span className="metric-value">{feedback.image_quality.brightness_score}/255</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill brightness" 
                        style={{ width: `${(feedback.image_quality.brightness_score / 255) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {feedback.image_quality.contrast_score !== undefined && (
                  <div className="metric">
                    <span className="metric-label">Contrast:</span>
                    <span className="metric-value">{feedback.image_quality.contrast_score}/100</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill contrast" 
                        style={{ width: `${Math.min(feedback.image_quality.contrast_score, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {feedback.image_quality.sharpness_score !== undefined && (
                  <div className="metric">
                    <span className="metric-label">Sharpness:</span>
                    <span className="metric-value">{feedback.image_quality.sharpness_score}/100</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill sharpness" 
                        style={{ width: `${Math.min(feedback.image_quality.sharpness_score, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Specific Issues Found */}
          {feedback.image_quality?.quality_issues && feedback.image_quality.quality_issues.length > 0 && (
            <div className="issues-section">
              <div className="section-title">🔍 Issues Detected:</div>
              <ul className="issues-list">
                {feedback.image_quality.quality_issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actionable Suggestions */}
          {feedback.image_quality?.suggestions && feedback.image_quality.suggestions.length > 0 && (
            <div className="suggestions-section">
              <div className="section-title">💡 Recommended Actions:</div>
              <ul className="suggestions-list">
                {feedback.image_quality.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      {/* General Tips */}
      {ocrTips && (
        <div className="ocr-tips-toggle">
          <details>
            <summary>📸 Pro Tips for Best Results</summary>
            <div className="ocr-tips-content">
              <div className="tip-category">
                <strong>Lighting:</strong>
                <ul>
                  <li>Use even, indirect lighting to avoid shadows</li>
                  <li>Natural daylight often works best</li>
                  <li>Avoid direct glare and reflections</li>
                </ul>
              </div>
              <div className="tip-category">
                <strong>Positioning:</strong>
                <ul>
                  <li>Hold camera directly above the text</li>
                  <li>Keep the camera steady or use support</li>
                  <li>Fill the frame with the code area</li>
                </ul>
              </div>
              <div className="tip-category">
                <strong>Cropping:</strong>
                <ul>
                  <li>Crop images to focus only on the code</li>
                  <li>Remove empty borders and distractions</li>
                  <li>Use the crop tool for better accuracy</li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default function Workspace({ code, setCode, user, setUser }) {
  // REMOVED: const [user, setUser] = useState(null); - Use the prop from App.js instead
  
  const [terminalOutput, setTerminalOutput] = useState("");
  const [autoIndent, setAutoIndent] = useState(true);
  const [running, setRunning] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [accuracy, setAccuracy] = useState(0);
  const [accStatus, setAccStatus] = useState("Estimated from Vision confidence");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPhase, setOcrPhase] = useState("Idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Enhanced OCR feedback states
  const [qualityFeedback, setQualityFeedback] = useState([]);
  const [overallReadability, setOverallReadability] = useState('unknown');
  const [ocrTips, setOcrTips] = useState(null);

  // Cropping states
  const [selectedImageForCrop, setSelectedImageForCrop] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  // REMOVED: enablePreprocessing state - now always enabled

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastPromptRef = useRef("");
  const navigate = useNavigate();
  const location = useLocation();
  const suppressQ = useRef([]);

  // Debug logging to see what's happening
  useEffect(() => {
    console.log("Workspace.jsx - Received user prop:", user);
    console.log("Workspace.jsx - URL search:", location.search);
  }, [user, location.search]);

  // Load OCR tips on component mount
  useEffect(() => {
    const loadOcrTips = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/ocr_tips`);
        setOcrTips(response.data);
      } catch (error) {
        console.log("Could not load OCR tips:", error);
      }
    };
    loadOcrTips();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("photon_user");
    if (setUser) setUser(null); // Update the state in App.js
    navigate("/");
    setMobileMenuOpen(false);
  };

  // Sockets + Terminal
  useEffect(() => {
    const log = (msg) => setTerminalOutput((p) => p + msg + "\n");
    const onStdout = ({ text }) => {
      let chunk = String(text ?? "");
      const hadTrailing = /\r?\n$/.test(chunk);
      chunk = chunk.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      if (suppressQ.current.length) {
        for (let i = 0; i < suppressQ.current.length; ) {
          const { token, prompt } = suppressQ.current[i];
          const tok = esc(token);
          const pr = prompt ? esc(prompt) : null;
          const before = chunk;
          if (pr) {
            const rePrTok = new RegExp(`(^|\\n)\\s*${pr}\\s*${tok}(?=\\n|$)`, "g");
            chunk = chunk.replace(rePrTok, (_m, pre) => pre);
            const rePromptOnly = new RegExp(`(^|\\n)\\s*${pr}\\s*(?=\\n|$)`, "g");
            chunk = chunk.replace(rePromptOnly, (_m, pre) => pre);
          }
          const reTokOnly = new RegExp(`(^|\\n)\\s*${tok}(?=\\n|$)`, "g");
          chunk = chunk.replace(reTokOnly, (_m, pre) => pre);
          if (chunk !== before) suppressQ.current.splice(i, 1);
          else i += 1;
        }
      }
      if (hadTrailing && !/\n$/.test(chunk)) chunk += "\n";
      setTerminalOutput((prev) => prev + chunk);
    };

    const onStdinReq = ({ prompt }) => {
      const p = prompt || "Input:";
      lastPromptRef.current = p;
      setPendingPrompt(p);
      setWaitingForInput(true);
    };

    const onExecEnd = () => {
      setRunning(false);
      setWaitingForInput(false);
      setPendingPrompt("");
      suppressQ.current = [];
    };

    socket.on("stdout", onStdout);
    socket.on("stdin_request", onStdinReq);
    socket.on("exec_end", onExecEnd);
    socket.on("connect", () => log("✓ Connected to runner"));
    socket.on("disconnect", (r) => log(`! Disconnected: ${r}`));
    socket.on("connect_error", (e) => log(`× Connect error: ${e?.message || e}`));

    return () => {
      socket.off("stdout", onStdout);
      socket.off("stdin_request", onStdinReq);
      socket.off("exec_end", onExecEnd);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, []);

  const runOrRestart = useCallback(() => {
    setTerminalOutput("");
    setWaitingForInput(false);
    setPendingPrompt("");
    suppressQ.current = [];
    socket.emit("exec_start", { code: code || "", auto_indent: autoIndent });
    setRunning(true);
  }, [code, autoIndent]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runOrRestart();
      }
      if (e.key === "Escape" && running) {
        e.preventDefault();
        setRunning(false);
        setWaitingForInput(false);
        setPendingPrompt("");
        setTerminalOutput((p) => p + "\n[process aborted]\n");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runOrRestart, running]);

  const openUploadPicker = () => {
    fileInputRef.current?.click();
    setMobileMenuOpen(false);
  };

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64, contentType = '') => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: contentType });
  };

  // Process image files (extracted from handleFilesSelected)
  const processImageFiles = async (files) => {
    try {
      setOcrLoading(true);
      setOcrPhase("Uploading");
      setUploadPct(0);
      setTerminalOutput((p) => p + `[ocr] uploading ${files.length} file(s)...\n`);

      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("auto_indent", String(autoIndent));
      // REMOVED: enable_preprocessing parameter - backend now always enables it

      const { data } = await axios.post(`${BASE_URL}/process_images`, form, {
        headers: { 
          "Content-Type": "multipart/form-data",
          // Add Authorization header if the OCR endpoint is protected
          ...(user?.token && { Authorization: `Bearer ${user.token}` })
        },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setUploadPct(pct);
          if (pct >= 100) setOcrPhase("Processing");
        },
      });

      const extracted = data?.extracted_text || "";
      const est = Number.isFinite(data?.estimated_accuracy) ? data.estimated_accuracy : 0;

      setAccuracy(Math.max(0, Math.min(100, est)));
      setAccStatus(data?.engine === "vision" ? "Google Vision" : data?.engine === "keras" ? "Keras OCR" : "Auto (Vision-first)");
      
      // Set enhanced feedback data
      setQualityFeedback(data?.quality_feedback || []);
      setOverallReadability(data?.overall_readability || 'unknown');

      if (extracted) {
        setCode(extracted);
        editorRef.current?.focus?.();
        const charCount = extracted.length;
        const fileCount = data?.file_count || files.length;
        setTerminalOutput((p) => p + `[ocr] Success! Processed ${fileCount} file(s), extracted ${charCount} characters.\n`);
        
        // Show quality summary in terminal
        if (data?.overall_readability) {
          const readabilityEmoji = {
            'excellent': '🎯',
            'good': '✓',
            'fair': '⚠️',
            'poor': '🔍'
          }[data.overall_readability] || '📊';
          
          setTerminalOutput((p) => p + `[ocr] Quality: ${data.overall_readability} ${readabilityEmoji} (${est}% accuracy)\n`);
        }
        
        // Show specific issues in terminal if any
        if (data?.quality_feedback) {
          data.quality_feedback.forEach((feedback, index) => {
            if (feedback.image_quality?.quality_issues && feedback.image_quality.quality_issues.length > 0) {
              setTerminalOutput((p) => p + `[ocr] ${feedback.filename}: ${feedback.image_quality.quality_issues.length} issue(s) detected\n`);
            }
            // Show quick fixes in terminal
            if (feedback.image_quality?.quick_fixes && feedback.image_quality.quick_fixes.length > 0) {
              feedback.image_quality.quick_fixes.slice(0, 2).forEach(fix => {
                setTerminalOutput((p) => p + `[ocr] Quick fix: ${fix}\n`);
              });
            }
            // Show preprocessing results
            if (feedback.preprocessing_log) {
              feedback.preprocessing_log.forEach(log => {
                if (log.includes('✅') || log.includes('Enhanced') || log.includes('Cropped')) {
                  setTerminalOutput((p) => p + `[ocr] ${log}\n`);
                }
              });
            }
          });
        }
      } else {
        setTerminalOutput((p) => p + "[ocr] No text detected. Try adjusting image quality.\n");
      }
    } catch (err) {
      setAccuracy(0);
      setAccStatus("Network Error");
      setTerminalOutput((p) => p + `[ocr] error: ${err?.response?.data?.error || err?.message || err}\n`);
    } finally {
      setOcrLoading(false);
      setOcrPhase("Idle");
      setUploadPct(0);
    }
  };

  // Enhanced file processing with cropping option
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Reset file input
    e.target.value = "";

    // If user wants to crop, show cropper for first image
    if (files.length === 1) {
      setSelectedImageForCrop(files[0]);
      setShowCropper(true);
      return;
    }

    // Otherwise process normally
    await processImageFiles(files);
  };

  // Handle crop completion
  const handleCropComplete = (cropResult) => {
    // Create a new file from the cropped image
    const croppedImageBlob = base64ToBlob(cropResult.cropped_image, 'image/png');
    const croppedFile = new File([croppedImageBlob], `cropped_${selectedImageForCrop.name}`, {
      type: 'image/png'
    });
    
    // Process the cropped image
    processImageFiles([croppedFile]);
    setShowCropper(false);
    setSelectedImageForCrop(null);
  };

  // Handle crop cancellation
  const handleCropCancel = () => {
    setShowCropper(false);
    // Process original image if user cancels crop
    if (selectedImageForCrop) {
      processImageFiles([selectedImageForCrop]);
    }
    setSelectedImageForCrop(null);
  };

  const goToCamera = () => {
    navigate("/camera");
    setMobileMenuOpen(false);
  };

  const goToAssistant = () => {
    navigate("/assistant");
    setMobileMenuOpen(false);
  };

  const goToHome = () => {
    navigate("/");
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const steps = [
    buildStep("#ws-run", "wink", "Run or restart your code. Tip: <b>Ctrl/⌘ + Enter</b>.", { side: "bottom" }),
    buildStep("#ws-editor", "smile", "Paste or type your code here.", { side: "right" }),
    buildStep("#ws-terminal", "happy", "Program output shows here.", { side: "top" }),
    buildStep("#ws-upload", "smile", "Upload code images to OCR them.", { side: "bottom" }),
    buildStep("#ws-camera", "smile", "Capture code via camera.", { side: "bottom" }),
    buildStep("#ws-assistant", "happy", "Open the Assistant for explanations or fixes.", { side: "bottom" }),
  ];

  const { start: startWsTour } = useMascotTour(steps, { stagePadding: 10, onDestroyed: () => localStorage.setItem("seen_ws_tour", "1") });
  const showFab = !localStorage.getItem("seen_ws_tour");

  return (
    <div className="workspace">
      {/* Header */}
      <header className="workspace-header">
        <div className="brand">
          <button 
            className="mobile-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <h1>Photon Workspace</h1>
        </div>

        {/* Desktop Navigation */}
        <div className="header-actions desktop-only">
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoIndent}
              onChange={(e) => setAutoIndent(e.target.checked)}
            />
            <span>Auto-indent</span>
          </label>

          {/* REMOVED: Auto-enhance toggle - now always enabled */}

          <button className="btn ghost" onClick={openUploadPicker} disabled={ocrLoading}>
            <FiUpload />
            <span>Upload</span>
          </button>

          <button className="btn ghost" onClick={goToCamera} disabled={ocrLoading}>
            <FiCamera />
            <span>Camera</span>
          </button>

          <button className="btn primary assistant" onClick={goToAssistant} disabled={ocrLoading}>
            <FiZap />
            <span>Assistant</span>
          </button>

          {user ? (
            <div className="user-info">
              {user.picture && <img src={user.picture} alt="profile" className="pfp" />}
              <span className="user-name">Welcome, {user.name}</span>
              <button className="btn ghost" onClick={goToHome}>
                <FiHome />
              </button>
              <button className="btn ghost" onClick={handleLogout}>
                <FiLogOut />
              </button>
            </div>
          ) : (
            <button className="btn ghost" onClick={() => navigate("/login")}>
              Login
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={toggleMobileMenu}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>Menu</h3>
              <button className="close-btn" onClick={toggleMobileMenu}>
                <FiX size={24} />
              </button>
            </div>
            
            <div className="mobile-menu-items">
              <button className="mobile-menu-item" onClick={goToHome}>
                <FiHome />
                <span>Home</span>
              </button>
              <button className="mobile-menu-item" onClick={goToAssistant}>
                <FiZap />
                <span>Assistant</span>
              </button>
              <button className="mobile-menu-item" onClick={openUploadPicker}>
                <FiUpload />
                <span>Upload Images</span>
              </button>
              <button className="mobile-menu-item" onClick={goToCamera}>
                <FiCamera />
                <span>Camera</span>
              </button>
              <button className="mobile-menu-item guide" onClick={() => {
                startWsTour();
                setMobileMenuOpen(false);
              }}>
                <span>Guide Me</span>
              </button>
              
              <div className="mobile-menu-section">
                <label className="mobile-toggle">
                  <input
                    type="checkbox"
                    checked={autoIndent}
                    onChange={(e) => setAutoIndent(e.target.checked)}
                  />
                  <span>Auto-indent</span>
                </label>
                {/* REMOVED: Auto-enhance toggle from mobile menu */}
              </div>

              {user ? (
                <div className="mobile-user-info">
                  <span className="mobile-user-name">Welcome, {user.name}</span>
                  <button className="mobile-menu-item logout" onClick={handleLogout}>
                    <FiLogOut />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <button className="mobile-menu-item login" onClick={() => {
                  navigate("/login");
                  setMobileMenuOpen(false);
                }}>
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="workspace-main">
        <section className="editor-pane">
          {ocrLoading && (
            <div className="ocr-overlay">
              <div className="ocr-spinner" />
              <div className="ocr-msg">
                {ocrPhase === "Uploading" ? `Uploading… ${uploadPct}%` : "Processing…"}
              </div>
            </div>
          )}

          <Editor
            height="60vh"
            defaultLanguage="python"
            value={code}
            onChange={(val) => setCode(val ?? "")}
            onMount={(ed) => (editorRef.current = ed)}
            options={{ 
              fontSize: 14, 
              minimap: { enabled: false }, 
              wordWrap: "on", 
              automaticLayout: true,
              scrollBeyondLastLine: false,
              lineNumbersMinChars: 3
            }}
          />
        </section>

        <section className="terminal-pane">
          <div className="terminal-card">
            <div className="terminal-header">
              <span className="terminal-title">Terminal</span>
              <button id="ws-run" className="btn run-btn" onClick={runOrRestart} disabled={ocrLoading}>
                <FiPlay className="icon" />
                <span>{running ? "Restart" : "Run"}</span>
              </button>
            </div>

            <div className="terminal">
              <TerminalView
                output={terminalOutput}
                waitingForInput={waitingForInput}
                prompt={pendingPrompt}
                onSendInput={(text) => {
                  const clean = String(text).replace(/\r?\n$/, "");
                  const promptNow = lastPromptRef.current || pendingPrompt;
                  if (clean) suppressQ.current.push({ token: clean, prompt: promptNow });
                  setTerminalOutput((prev) => mergePromptAndInput(prev, promptNow, clean));
                  socket.emit("stdin", { text });
                  setWaitingForInput(false);
                  setPendingPrompt("");
                  lastPromptRef.current = "";
                }}
              />
            </div>
          </div>

          <div className="ocr-card">
            <div className="ocr-head">
              <span>OCR Accuracy</span>
              <strong>{Math.round(accuracy)}%</strong>
            </div>
            <div className="ocr-sub">
              {ocrLoading ? (ocrPhase === "Uploading" ? "Uploading…" : "Processing…") : accStatus}
              {!ocrLoading && " + Enhanced"} {/* Always show "Enhanced" when not loading */}
            </div>
            <div className="ocr-bar">
              <div
                className={`ocr-fill ${ocrLoading ? "indeterminate" : ""}`}
                style={!ocrLoading ? { width: `${Math.round(accuracy)}%` } : undefined}
              />
            </div>
            
            {/* Enhanced OCR Feedback Panel */}
            <OCRFeedbackPanel 
              accuracy={accuracy}
              qualityFeedback={qualityFeedback}
              overallReadability={overallReadability}
              ocrLoading={ocrLoading}
              ocrTips={ocrTips}
            />
          </div>
        </section>
      </main>

      {/* Image Cropper Modal */}
      {showCropper && (
        <ImageCropper
          image={selectedImageForCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Guide FAB */}
      {showFab && (
        <MascotGuideButton
          steps={steps}
          position="br"
          pulse
          onStart={() => {
            localStorage.setItem("seen_ws_tour", "1");
            startWsTour();
          }}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelected} style={{ display: "none" }} />
    </div>
  );
}