import express from "express";
import http from "node:http";
import https from "node:https";
import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";
import type { ProxyConfig } from "./types";

/**
 * 创建并启动代理服务器
 */
export function createProxyServer(config: ProxyConfig) {
  const {
    port,
    target,
    logger = true,
    timeout = 1000 * 60 * 60,
  } = config;

  const app = express();
  const targetBase = new URL(target);

  app.use((req, res) => {
    // 处理 OPTIONS 预检请求
    if (req.method === "OPTIONS") {
      const reqOrigin = req.headers.origin as string | undefined;
      const headers: http.OutgoingHttpHeaders = {
        "access-control-allow-origin": reqOrigin || "*",
        "access-control-allow-credentials": "true",
        "access-control-allow-methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "access-control-allow-headers": req.headers["access-control-request-headers"] || "*",
        "access-control-max-age": "86400", // 24小时
      };
      if (reqOrigin) {
        headers["vary"] = "Origin";
      }
      res.writeHead(204, headers);
      res.end();
      return;
    }

    // 全部代理到目标网页，通过后端去请求包一层
    const upstreamUrl = new URL(req.url || "/", targetBase);
    const isHttps = upstreamUrl.protocol === "https:";
    const client = isHttps ? https : http;

    if (logger) {
      const method = req.method || "GET";
      const methodColor = method === "GET" ? chalk.green : 
                         method === "POST" ? chalk.blue :
                         method === "PUT" ? chalk.yellow :
                         method === "DELETE" ? chalk.red : chalk.white;
      console.log(`${methodColor.bold(`[${method}]`)} ${chalk.gray(upstreamUrl.href)}`);
    }

    // 复制并清理请求头
    const headers: http.OutgoingHttpHeaders = { ...req.headers };
    // 设置为目标站点的来源头
    headers["host"] = targetBase.host;
    headers["origin"] = `${targetBase.protocol}//${targetBase.host}`;
    headers["referer"] = `${targetBase.protocol}//${targetBase.host}`;
    // 移除逐跳（hop-by-hop）头
    delete headers["connection"]; // 由 Node 自行管理
    delete headers["keep-alive"];
    delete headers["proxy-authenticate"];
    delete headers["proxy-authorization"];
    delete headers["te"];
    delete headers["trailers"];
    delete headers["transfer-encoding"];
    delete headers["upgrade"];

    const options: http.RequestOptions = {
      protocol: upstreamUrl.protocol,
      hostname: upstreamUrl.hostname,
      port: upstreamUrl.port || (isHttps ? 443 : 80),
      method: req.method,
      path: upstreamUrl.pathname + upstreamUrl.search,
      headers,
    };

    const proxyReq = client.request(options, (proxyRes) => {
      // 复制上游响应头并添加 CORS 头
      const resHeaders: http.OutgoingHttpHeaders = { ...proxyRes.headers };
      const reqOrigin = req.headers.origin as string | undefined;
      if (reqOrigin) {
        resHeaders["access-control-allow-origin"] = reqOrigin;
        resHeaders["vary"] = [
          ...(Array.isArray(resHeaders["vary"]) ? resHeaders["vary"] : (resHeaders["vary"] ? [resHeaders["vary"] as string] : [])),
          "Origin",
        ].join(", ");
      } else {
        resHeaders["access-control-allow-origin"] = "*";
      }
      resHeaders["access-control-allow-credentials"] = "true";

      // 如有重定向，重写 Location 到本地服务，避免跳出代理域
      const loc = resHeaders["location"] as string | string[] | undefined;
      if (loc) {
        const raw = Array.isArray(loc) ? loc[0] : loc;
        try {
          const locUrl = new URL(raw, targetBase);
          const targetOrigin = `${targetBase.protocol}//${targetBase.host}`;
          if (locUrl.href.startsWith(targetOrigin)) {
            resHeaders["location"] = locUrl.href.replace(
              targetOrigin,
              `http://localhost:${port}`
            );
          }
        } catch {
          // ignore invalid URL
        }
      }

      res.writeHead(proxyRes.statusCode || 500, resHeaders);
      proxyRes.pipe(res, { end: true });
    });

    // 超时与错误处理
    proxyReq.setTimeout(timeout, () => {
      proxyReq.destroy(new Error("Upstream request timeout"));
    });
    proxyReq.on("error", (err) => {
      if (logger) {
        console.error(chalk.red.bold("❌ 代理错误:"), chalk.yellow(err.message));
      }
      if (!res.headersSent) {
        res.status(502).send("网关错误");
      } else {
        res.end();
      }
    });

    // 将客户端请求体转发给上游
    req.pipe(proxyReq, { end: true });
  });

  const server = app.listen(port, () => {
    const startupMessage = boxen(
      `${gradient.rainbow("🚀 代理服务器启动成功！")}\n\n` +
      `${chalk.cyan.bold("本地地址:")} ${chalk.green.underline(`http://localhost:${port}`)}\n` +
      `${chalk.cyan.bold("代理目标:")} ${chalk.yellow(target)}\n` +
      `${chalk.cyan.bold("日志状态:")} ${logger ? chalk.green("开启") : chalk.gray("关闭")}\n` +
      `${chalk.cyan.bold("超时时间:")} ${chalk.magenta(`${timeout}ms`)}\n\n` +
      `${chalk.gray("按")} ${chalk.yellow.bold("Ctrl+C")} ${chalk.gray("停止服务")}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: "cyan",
        title: "Web Proxy CLI",
        titleAlignment: "center",
      }
    );
    console.log(startupMessage);
  });

  return server;
}
