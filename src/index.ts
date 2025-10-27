import { createProxyServer } from "./server";

const PORT = Number(process.env.PORT) || 8000;
const TARGET_URL = process.env.TARGET_URL || "";

createProxyServer({
  port: PORT,
  target: TARGET_URL,
  logger: true,
});
