// src/pages/Assistant.jsx
import React, { useEffect, useRef, useState } from "react";
import { FiArrowUpCircle, FiPlus, FiMessageSquare, FiTrash2, FiMenu, FiX } from "react-icons/fi";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Assistant.css";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const AVATAR = `${process.env.PUBLIC_URL}/images/photon.png`;

function CodeBlock({ lang, content, onCopy, copied }) {
  return (
    <div className="code-card">
      <div className="code-card-bar">
        <span className="code-lang">{lang || "code"}</span>
        <button className="btn ghost xsmall" onClick={onCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="code-pre">
        <code>{content}</code>
      </pre>
    </div>
  );
}

const TypingDots = () => (
  <div className="typing-line">
    <div className="typing-dots">
      <span />
      <span />
      <span />
    </div>
  </div>
);

export default function Assistant({ code, setCode, user, setUser }) {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const endOfChatRef = useRef(null);
  const textareaRef = useRef(null);
  const didAutoSend = useRef(false);
  const sidebarRef = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log("Assistant.jsx - Received user prop:", user);
  }, [user]);

  // ADDED: Debug JWT token validity
  useEffect(() => {
    if (user?.token) {
      console.log("🔍 Testing JWT token...");
      axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      .then(() => console.log("✅ Token is valid"))
      .catch(error => {
        console.error("❌ Token is invalid:", error.response?.status, error.response?.data);
        // Auto-logout if token is invalid
        handleLogout();
      });
    }
  }, [user]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);

  // Load user's chat history
  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  // Create new chat
  const createNewChat = async () => {
    try {
      const response = await axios.post(`${BASE_URL}/chats`, {
        user_email: user.email,
        title: "New Chat"
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      const newChat = response.data;
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat._id);
      setMessages([]);
      setInput("");
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to create new chat:", error);
      // Fallback: create local chat
      const tempChat = {
        _id: `temp-${Date.now()}`,
        title: "New Chat",
        createdAt: new Date().toISOString()
      };
      setChats(prev => [tempChat, ...prev]);
      setCurrentChatId(tempChat._id);
      setMessages([]);
      setSidebarOpen(false);
    }
  };

  // Load chat history
  const loadChatHistory = async () => {
    try {
      setLoadingChats(true);
      const response = await axios.get(`${BASE_URL}/chats/${user.email}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setChats(response.data);
      
      if (response.data.length > 0) {
        setCurrentChatId(response.data[0]._id);
        loadChatMessages(response.data[0]._id);
      } else {
        createNewChat();
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      createNewChat();
    } finally {
      setLoadingChats(false);
    }
  };

  // Load messages for a specific chat
  const loadChatMessages = async (chatId) => {
    try {
      const response = await axios.get(`${BASE_URL}/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setMessages(response.data);
      setCurrentChatId(chatId);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Failed to load chat messages:", error);
    }
  };

  // Delete chat
  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${BASE_URL}/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setChats(prev => prev.filter(chat => chat._id !== chatId));
      
      if (currentChatId === chatId) {
        const remainingChats = chats.filter(chat => chat._id !== chatId);
        if (remainingChats.length > 0) {
          setCurrentChatId(remainingChats[0]._id);
          loadChatMessages(remainingChats[0]._id);
        } else {
          createNewChat();
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // UPDATED: Enhanced logout function
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    if (setUser) setUser(null);
    navigate("/login"); // Go to login page directly
  };

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [input]);

  const scrollToBottom = () =>
    endOfChatRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const onCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCode?.(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const parseContent = (text) => {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    const chunks = [];
    let last = 0;
    while ((match = regex.exec(text))) {
      if (match.index > last) chunks.push({ type: "text", content: text.slice(last, match.index) });
      chunks.push({ type: "code", lang: match[1], content: match[2] });
      last = regex.lastIndex;
    }
    if (last < text.length) chunks.push({ type: "text", content: text.slice(last) });
    return chunks;
  };

  const renderMessage = (msg, i) => {
    if (msg.role === "user") {
      return (
        <div key={i} className="user-message">
          <div className="user-bubble">
            {msg.content}
          </div>
        </div>
      );
    }
    const chunks = parseContent(msg.content);
    return (
      <div key={i} className="ai-line">
        <img className="ai-avatar" src={AVATAR} alt="Photon" />
        <div className="ai-bubble">
          {chunks.map((ch, j) =>
            ch.type === "code" ? (
              <CodeBlock
                key={j}
                lang={ch.lang}
                content={ch.content}
                onCopy={() => onCopy(ch.content, `${i}-${j}-copy`)}
                copied={copiedKey === `${i}-${j}-copy`}
              />
            ) : (
              <p key={j}>{ch.content}</p>
            )
          )}
        </div>
      </div>
    );
  };

  // Save message to database
  const saveMessage = async (chatId, role, content) => {
    try {
      await axios.post(`${BASE_URL}/chats/${chatId}/messages`, {
        role,
        content
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  // Update chat title based on first message
  const updateChatTitle = async (chatId, firstMessage) => {
    try {
      const title = firstMessage.length > 30 
        ? firstMessage.substring(0, 30) + '...' 
        : firstMessage;
      
      await axios.put(`${BASE_URL}/chats/${chatId}`, {
        title
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      setChats(prev => prev.map(chat => 
        chat._id === chatId ? { ...chat, title } : chat
      ));
    } catch (error) {
      console.error("Failed to update chat title:", error);
    }
  };

  const sendMessage = async (prompt) => {
    if (!prompt?.trim()) return;
    
    if (!currentChatId) {
      await createNewChat();
    }
    
    const userMessage = { role: "user", content: prompt, timestamp: new Date() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");

    await saveMessage(currentChatId, "user", prompt);

    if (messages.length === 0) {
      await updateChatTitle(currentChatId, prompt);
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/ask_ai`, {
        message: prompt,
        context_code: code,
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      const aiResponse = String(data?.response ?? "");
      streamIntoLastMessage(aiResponse, currentChatId);
    } catch {
      const errorMessage = { role: "assistant", content: "⚠️ Failed to fetch AI response.", timestamp: new Date() };
      setMessages(prev => [...prev, errorMessage]);
      await saveMessage(currentChatId, "assistant", "⚠️ Failed to fetch AI response.");
      setIsTyping(false);
    }
  };

  const streamIntoLastMessage = (fullText, chatId) => {
    const STEP = 3;
    const MIN = 8, MAX = 14;
    let i = 0;
    setIsTyping(true);
    setMessages(prev => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);
    scrollToBottom();

    const tick = async () => {
      i += STEP;
      setMessages(prev => {
        const out = [...prev];
        const last = out[out.length - 1];
        if (last?.role === "assistant") last.content = fullText.slice(0, i);
        return out;
      });
      
      if (i < fullText.length) {
        setTimeout(tick, MIN + Math.random() * (MAX - MIN));
      } else {
        setIsTyping(false);
        scrollToBottom();
        saveMessage(chatId, "assistant", fullText);
      }
    };
    tick();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuick = (q) => sendMessage(q);

  useEffect(() => {
    const st = location.state;
    const q = st?.query;
    const auto = st?.autoSend === true;
    if (!didAutoSend.current && q && auto) {
      didAutoSend.current = true;
      sendMessage(q);
      navigate(".", { replace: true, state: null });
    }
  }, [location.state, navigate, currentChatId]);

  return (
    <div className="page-shell assistant-page">
      <div className="assistant-layout">
        {/* Sidebar with toggle */}
        <div 
          ref={sidebarRef}
          className={`chat-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        >
          <div className="sidebar-header">
            <div className="sidebar-header-top">
              <h3>Chat History</h3>
              <button className="btn sidebar-close-btn" onClick={toggleSidebar}>
                <FiX size={20} />
              </button>
            </div>
            <button className="btn primary new-chat-btn" onClick={createNewChat}>
              <FiPlus size={16} />
              New Chat
            </button>
          </div>
          
          <div className="chats-list">
            {loadingChats ? (
              <div className="loading-chats">Loading chats...</div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat._id}
                  className={`chat-item ${currentChatId === chat._id ? 'active' : ''}`}
                  onClick={() => loadChatMessages(chat._id)}
                >
                  <FiMessageSquare size={16} />
                  <span className="chat-title">{chat.title}</span>
                  <button 
                    className="btn ghost delete-chat-btn"
                    onClick={(e) => deleteChat(chat._id, e)}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Overlay for mobile */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}

        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Header */}
          <div className="assistant-header-wrap">
            <header className="workspace-header">
              <div className="brand">
                <button 
                  className="btn sidebar-toggle-btn"
                  onClick={toggleSidebar}
                  aria-label="Toggle chat history"
                >
                  <FiMenu size={20} />
                </button>
                <Link to="/" className="brand-link" aria-label="Go home">
                  <img
                    src={`${process.env.PUBLIC_URL}/images/photon.png`}
                    alt="Photon"
                    className="assistant-logo"
                  />
                </Link>
                <h1 className="brand-title">Assistant</h1>
              </div>

              <div className="header-actions">
                <button className="btn primary assistant" onClick={() => navigate("/workspace")}>
                  Workspace
                </button>
                
                {user ? (
                  <div className="user-info">
                    <span className="user-name">Welcome, {user.name}</span>
                    <button className="btn logout-btn" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                ) : (
                  <button className="btn login-btn" onClick={() => navigate("/login")}>
                    Login
                  </button>
                )}
              </div>
            </header>
          </div>

          {/* Chat Messages */}
          <main className="assistant-container">
            <div className="chat-body">
              {messages.length === 0 && !isTyping ? (
                <div className="empty-chat">
                  <img src={AVATAR} alt="Photon" className="empty-avatar" />
                  <h3>How can I help you today?</h3>
                  <p>Ask me anything about coding, debugging, or explanations!</p>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => renderMessage(m, i))}
                  {isTyping && (
                    <div className="ai-line typing">
                      <img className="ai-avatar" src={AVATAR} alt="Photon" />
                      <div className="ai-bubble">
                        <TypingDots />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={endOfChatRef} style={{ height: 1 }} />
            </div>
          </main>

          {/* Input Area */}
          <div className="chat-footer">
            <div className="quick-bar">
              <button onClick={() => handleQuick("Fix the error in my code.")}>Fix Error</button>
              <button onClick={() => handleQuick("Explain this code.")}>Explain Code</button>
              <button onClick={() => handleQuick("Suggest improvements for this code.")}>
                Make Suggestions
              </button>
              <button onClick={() => handleQuick("Explain this error.")}>Explain Error</button>
            </div>

            <div className="chat-input-box">
              <textarea
                ref={textareaRef}
                placeholder="Ask something about your code..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
              />
              <button onClick={() => sendMessage(input)} aria-label="Send" disabled={!input.trim()}>
                <FiArrowUpCircle size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}