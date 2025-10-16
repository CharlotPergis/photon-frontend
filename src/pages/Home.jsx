import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowUpCircle, FiMenu, FiX } from "react-icons/fi";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./Home.css";

import MascotGuideButton from "../tour/MascotGuideButton";
import { buildStep, useMascotTour } from "../tour/useMascotTour";
import "../tour/mascot.css";

const logo = `${process.env.PUBLIC_URL}/images/photon.png`;

export default function Home({ user, setUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Fix Code");
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showFab, setShowFab] = useState(() => !localStorage.getItem("seen_home_tour"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Use the user from props, with fallback to localStorage
  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem("photon_user");
      if (saved) {
        try {
          const userObj = JSON.parse(saved);
          setUser(userObj);
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("photon_user");
        }
      }
    }
  }, [user, setUser]);

  const samples = {
    "Fix Code": {
      user: "How can I fix my transaction function? It fails on empty input.",
      ai: "You should check for empty input at the start and raise an exception or return early.",
      code: `def process_transaction(amount):
    if amount is None or amount == "":
        raise ValueError("Invalid amount.")
    # proceed with transaction`,
    },
    Suggestions: {
      user: "Any suggestions to optimize my loop?",
      ai: "Try using list comprehensions for better performance and readability.",
      code: `squares = [i * i for i in range(10)]`,
    },
    "Explain Code": {
      user: "Can you explain what this class does?",
      ai: "This class defines a simple counter with methods to increment and get the current count.",
      code: `class Counter:
    def __init__(self):
        self.count = 0
    def increment(self):
        self.count += 1
    def get(self):
        return self.count`,
    },
    "Explain Error": {
      user: "Why am I getting a 'TypeError: unsupported operand types'?",
      ai: "You're trying to add a string and a number. Convert types before operations.",
      code: `name = "John"
age = 25
print(name + str(age))`,
    },
  };

  const goAssistant = (q, { autoSend = false } = {}) => {
    const query = (q ?? chatInput).trim();
    if (query) navigate("/assistant", { state: { query, autoSend } });
    else navigate("/assistant");
    setMobileMenuOpen(false);
  };

  // ---- Tour ----
  const getTabsAnchorSelector = () => {
    const active = document.querySelector("#home-tabs .pill.active");
    return active ? "#home-tabs .pill.active" : "#home-tabs .pill:nth-child(1)";
  };

  const steps = [
    buildStep(
      "#home-input",
      "smile",
      "Type your question here. Press <b>Enter</b> or click <b>Send</b> to ask me in the Assistant.",
      { side: "bottom" }
    ),
    buildStep(
      "#home-send",
      "wink",
      "This sends your text and opens the Assistant. I'll reply right away!",
      { side: "bottom" }
    ),
    buildStep(
      "#home-open",
      "happy",
      "Prefer a blank slate? This opens the Assistant using your current text.",
      { side: "bottom" }
    ),
    buildStep(
      getTabsAnchorSelector(),
      "smile",
      "These are sample topics—just tabs. They won't change your text.",
      { side: "bottom", align: "center" }
    ),
    buildStep(
      "#home-sample-card",
      "happy",
      "Click this card to try a sample question. I'll send it to the Assistant for you.",
      { side: "top" }
    ),
  ];

  const { start: startHomeTourRaw } = useMascotTour(steps, {
    stagePadding: 10,
    onDestroyed: () => localStorage.setItem("seen_home_tour", "1"),
  });

  const startHomeTour = () => startHomeTourRaw();
  const startFromFab = () => {
    localStorage.setItem("seen_home_tour", "1");
    setShowFab(false);
    startHomeTourRaw();
  };

  // --- Login & Logout handlers ---
  const handleLogout = () => {
    localStorage.removeItem("photon_user");
    setUser(null); // This updates the state in App.js
    navigate("/");
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="home">
      <div className="bg-blobs" />

      {/* NAVBAR */}
      <header className="navbar glass">
        <div className="brand">
          <button 
            className="mobile-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <img src={logo} alt="Photon" className="logo" />
          <strong className="brand-text">Photon</strong>
          <button className="btn ghost small guide-btn desktop-only" onClick={startHomeTour}>
            Guide me
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-buttons desktop-nav">
          {user ? (
            <div className="user-info">
              <span className="user-name">Welcome, {user.name}</span>
              <button className="btn small logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button
              className="btn small login-btn"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          )}
        </div>

        {/* Mobile Navigation Overlay */}
        {mobileMenuOpen && (
          <div className="mobile-nav-overlay" onClick={toggleMobileMenu}>
            <div className="mobile-nav-content" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-nav-header">
                <img src={logo} alt="Photon" className="mobile-nav-logo" />
                <span>Menu</span>
                <button className="mobile-nav-close" onClick={toggleMobileMenu}>
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="mobile-nav-buttons">
                <button
                  className="mobile-nav-btn guide"
                  onClick={() => {
                    startHomeTour();
                    setMobileMenuOpen(false);
                  }}
                >
                  Guide Me
                </button>
                {user ? (
                  <div className="mobile-user-info">
                    <span className="mobile-user-name">Welcome, {user.name}</span>
                    <button className="mobile-nav-btn logout" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    className="mobile-nav-btn login"
                    onClick={() => {
                      navigate("/login");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="hero">
        <h1>What's on the agenda today?</h1>

        <div className="promptbar glass">
          <input
            id="home-input"
            className="prompt-input"
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask anything"
            disabled={busy}
            onKeyDown={(e) => e.key === "Enter" && goAssistant(undefined, { autoSend: true })}
          />
          <button
            id="home-send"
            className="iconbtn"
            onClick={() => goAssistant(undefined, { autoSend: true })}
            title="Send to Assistant"
            disabled={busy}
          >
            <FiArrowUpCircle />
          </button>
        </div>

        <div className="cta">
          <button
            id="home-open"
            className="btn primary"
            onClick={() => goAssistant(chatInput || samples[activeTab].user, { autoSend: false })}
            disabled={busy}
          >
            Open Assistant
          </button>

          <button
            id="home-workspace"
            className="btn primary"
            onClick={() => navigate("/workspace")}
            disabled={busy}
          >
            Open Workspace
          </button>
        </div>
      </section>

      {/* SAMPLES */}
      <section className="samples">
        <h3>Samples</h3>

        <div id="home-tabs" className="pills">
          {Object.keys(samples).map((tab) => (
            <button
              key={tab}
              className={`pill ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              disabled={busy}
            >
              {tab}
            </button>
          ))}
        </div>

        <div
          id="home-sample-card"
          className="card glass"
          onClick={() => goAssistant(samples[activeTab].user, { autoSend: true })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && goAssistant(samples[activeTab].user, { autoSend: true })}
        >
          <div className="row">
            <div className="label">User</div>
            <p>{samples[activeTab].user}</p>
          </div>
          <div className="row">
            <div className="label">AI</div>
            <p>{samples[activeTab].ai}</p>
          </div>

          <div className="code">
            <SyntaxHighlighter
              language="python"
              style={vscDarkPlus}
              wrapLongLines
              customStyle={{ background: "transparent", margin: 0, padding: "14px 16px" }}
            >
              {samples[activeTab].code}
            </SyntaxHighlighter>
          </div>
        </div>
      </section>

      {/* MASCOT GUIDE BUTTON */}
      {showFab && (
        <MascotGuideButton steps={steps} position="br" pulse onStart={startFromFab} />
      )}
    </div>
  );
}