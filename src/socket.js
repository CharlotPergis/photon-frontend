import { io } from "socket.io-client";

export const socket = io("https://photon-backend-viye.onrender.com", {
  transports: ["polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 25000,
});
