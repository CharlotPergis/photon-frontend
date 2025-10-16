import React from "react";
import { useMascotTour } from "./useMascotTour";
import "./mascot.css";

const wink = `${process.env.PUBLIC_URL}/images/logo_2.png`;

/**
 * Props:
 *  - steps: driver.js steps (use buildStep helper to create)
 *  - options: driver options override
 *  - position: "br" | "bl" | "tr" | "tl" (default br)
 *  - pulse: boolean (default true)
 *  - title: aria-label
 *  - onStart: optional callback fired before tour starts
 */
export default function MascotGuideButton({
  steps,
  options,
  position = "br",
  pulse = true,
  title = "Guide me",
  onStart,
}) {
  const { start } = useMascotTour(steps, options);

  const style = {};
  if (position.includes("b")) style.bottom = 20;
  if (position.includes("t")) style.top = 20;
  if (position.includes("r")) style.right = 20;
  if (position.includes("l")) style.left = 20;

  return (
    <button
      type="button"
      className={`mascot-fab ${pulse ? "pulse" : ""}`}
      style={style}
      onClick={() => { onStart?.(); start(); }}
      aria-label={title}
      title={title}
    >
      <img src={wink} alt="Photon mascot" />
    </button>
  );
}
