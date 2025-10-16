import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./mascot.css";

const IMG = {
  wink:   `${process.env.PUBLIC_URL}/images/logo_2.png`,
  happy:  `${process.env.PUBLIC_URL}/images/logo_3.png`,
  smile:  `${process.env.PUBLIC_URL}/images/photon.png`,
};

/** Build one step (selector to spotlight, mascot mood, html/text message) */
export function buildStep(selector, mood, text, opts = {}) {
  const side  = opts.side  || "bottom";
  const align = opts.align || "start";
  const title = opts.title || "Photon guide";
  const popoverClassName = `photon-popover ${opts.popoverClassName || ""}`.trim();

  const html = `
    <div class="photon-tour">
      <img class="photon-avatar" src="${IMG[mood] || IMG.smile}" alt="${mood}">
      <div class="photon-bubble">${text}</div>
    </div>
  `;

  return {
    element: selector,
    popover: { title, description: html, side, align, className: popoverClassName },
  };
}

/** Hook that returns .start() to kick off the tour */
export function useMascotTour(steps, options = {}) {
  const DEFAULTS = {
    animate: true,
    allowClose: true,
    overlayColor: "rgba(0,0,0,.65)",
    stagePadding: 6,
    smoothScroll: true,
    showProgress: true,
  };

  return {
    start: () => driver({ ...DEFAULTS, ...options, steps }).drive(),
  };
}
