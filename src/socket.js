import { io } from "socket.io-client";

// Use environment variable for backend URL, fallback to localhost for dev
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:5001";

// TEMP: force polling so we bypass websocket upgrade issues
export const socket = io(BACKEND_URL, {
  transports: ["polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 25000,
});
