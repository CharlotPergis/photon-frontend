import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./Terminal.css";

export default function TerminalView({
  output = "",
  waitingForInput = false,
  prompt = "",
  onSendInput,
}) {
  const shellRef = useRef(null);
  const inputRef = useRef(null);
  const [value, setValue] = useState("");

  // Normalize newlines once
  const normOut = useMemo(
    () => String(output).replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
    [output]
  );
  const lines = useMemo(() => normOut.split("\n"), [normOut]);

  // Hide a duplicated prompt line if the last printed line equals the current prompt
  const { visibleLines, showPromptInline } = useMemo(() => {
    if (!waitingForInput || !prompt) return { visibleLines: lines, showPromptInline: false };

    const trimmed = [...lines];
    while (trimmed.length && trimmed[trimmed.length - 1] === "") trimmed.pop();

    const last = trimmed[trimmed.length - 1] ?? "";
    const lastNoSpaces = last.replace(/\s+$/g, "");
    const promptNoSpaces = String(prompt).replace(/\s+$/g, "");

    if (lastNoSpaces === promptNoSpaces) {
      trimmed.pop(); // avoid duplicate printed prompt
      return { visibleLines: trimmed, showPromptInline: true };
    }
    return { visibleLines: lines, showPromptInline: true };
  }, [lines, waitingForInput, prompt]);

  // Smooth autoscroll when new output arrives
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visibleLines.length, showPromptInline]);

  // Focus inline input when the program requests stdin
  useEffect(() => {
    if (waitingForInput && inputRef.current) inputRef.current.focus();
  }, [waitingForInput]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Send even if empty so users can submit a blank line when needed
      onSendInput?.(value + "\n");
      setValue("");
    }
  };

  return (
    <div className="terminal-shell">
      <div
        className="terminal-output"
        ref={shellRef}
        aria-live="polite"
        aria-atomic="false"
        role="log"
      >
        {visibleLines.map((ln, i) => (
          <div className="line" key={i}>{ln}</div>
        ))}

        {waitingForInput && showPromptInline && (
          <div className="stdin-row">
            <span className="prompt">{prompt}</span>
            <input
              ref={inputRef}
              className="stdin"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
}
