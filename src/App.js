import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Workspace from "./pages/Workspace";
import Assistant from "./pages/Assistant";
import Login from "./pages/Login";

function App() {
  // Persisted editor code
  const [code, setCode] = useState(() => localStorage.getItem("photon_code") || "");

  // Persisted user session - updated to use full user object
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("photon_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Handle Google OAuth redirect in App.js
  useEffect(() => {
    const handleGoogleOAuth = () => {
      const query = new URLSearchParams(window.location.search);
      const token = query.get("token");
      const email = query.get("email");
      const name = query.get("name");
      const picture = query.get("picture");

      console.log("App.js - Google OAuth check:", { 
        hasToken: !!token, 
        hasEmail: !!email,
        currentUser: !!user,
        currentPath: window.location.pathname
      });

      if (token && email && !user) {
        console.log("App.js - Google OAuth redirect detected");
        
        const userObj = {
          token,
          email,
          name: name || "Google User",
          picture: picture || "",
          id: `google-${email}`
        };
        
        console.log("App.js - Setting user from Google OAuth:", userObj);
        setUser(userObj);
        
        // Clean up URL - remove query parameters
        if (window.location.search) {
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
          console.log("App.js - Cleaned URL to:", cleanUrl);
        }
      }
    };

    handleGoogleOAuth();
  }, [user]); // Only run when user changes

  // Keep code saved
  useEffect(() => {
    localStorage.setItem("photon_code", code);
  }, [code]);

  // Save login session - updated for new user object
  useEffect(() => {
    console.log("App.js - User state changed:", user);
    if (user) {
      localStorage.setItem("photon_user", JSON.stringify(user));
      console.log("App.js - User saved to localStorage");
    } else {
      localStorage.removeItem("photon_user");
      console.log("App.js - User removed from localStorage");
    }
  }, [user]);

  return (
    <Router>
      <Routes>
        {/* Home Page */}
        <Route path="/" element={<Home user={user} setUser={setUser} />} />

        {/* Login Page */}
        <Route
          path="/login"
          element={
            user ? <Navigate to="/workspace" replace /> : <Login setUser={setUser} />
          }
        />

        {/* Protected Workspace */}
        <Route
          path="/workspace"
          element={
            user ? (
              <Workspace code={code} setCode={setCode} user={user} setUser={setUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Protected Assistant */}
        <Route
          path="/assistant"
          element={
            user ? (
              <Assistant code={code} setCode={setCode} user={user} setUser={setUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Redirect anything else to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;