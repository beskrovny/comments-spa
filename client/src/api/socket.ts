import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL;
const socketUrl = API_URL && !API_URL.startsWith('/') ? API_URL : undefined;

export const socket = io(socketUrl, {
  autoConnect: false,
});