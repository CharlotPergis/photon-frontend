import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Workspace from "./pages/Workspace";
import Assistant from "./pages/Assistant";
import LoginPage from "./pages/Login";
import Dashboard from "./Dashboard";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("photon_email");
    if (saved) setUser(saved);
  }, []);

  return (
    <Router>
      <Routes>
        {/* 🏠 Home Page */}
        <Route
          path="/"
          element={user ? <Navigate to="/workspace" /> : <Home />}
        />

        {/* 🔐 Login Page */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/workspace" />
            ) : (
              <LoginPage setUser={setUser} />
            )
          }
        />

        {/* 📊 Dashboard (protected) */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />

        {/* 💻 Workspace (protected) */}
        <Route
          path="/workspace"
          element={user ? <Workspace user={user} /> : <Navigate to="/login" />}
        />

        {/* 🤖 Assistant (protected) */}
        <Route
          path="/assistant"
          element={user ? <Assistant /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
}

export default App;
