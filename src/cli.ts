#!/usr/bin/env node
import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";
import { createProxyServer } from "./server";
import type { ProxyConfig } from "./types";

const PACKAGE_VERSION = "1.0.0";

function printHelp() {
  const title = gradient.pastel.multiline("Web Proxy CLI");
  
  console.log(`
${title}
${chalk.gray("简单而强大的 CORS 代理服务器工具")}

${chalk.cyan.bold("用法:")}
  ${chalk.green("proxy")} [选项]
  ${chalk.green("proxy init")}
  ${chalk.green("proxy start")} [选项]

${chalk.cyan.bold("命令:")}
  ${chalk.yellow("init")}              在当前目录生成 proxy.config.js 配置文件
  ${chalk.yellow("start")}             启动代理服务器（默认命令）

${chalk.cyan.bold("选项:")}
  ${chalk.magenta("-p, --port")} <端口>       监听端口（默认：8000）
  ${chalk.magenta("-t, --target")} <地址>     代理目标地址（${chalk.red("必填")}）
  ${chalk.magenta("-c, --config")} <文件>     配置文件路径（默认：proxy.config.js）
  ${chalk.magenta("--no-logger")}             禁用请求日志
  ${chalk.magenta("--timeout")} <毫秒>        请求超时时间（默认：30000）
  ${chalk.magenta("-v, --version")}           显示版本
  ${chalk.magenta("-h, --help")}              显示帮助信息

${chalk.cyan.bold("示例:")}
  ${chalk.gray("# 使用命令行参数启动代理")}
  ${chalk.green("proxy")} ${chalk.magenta("--port")} 8000 ${chalk.magenta("--target")} http://example.com

  ${chalk.gray("# 使用配置文件")}
  ${chalk.green("proxy")} ${chalk.magenta("--config")} proxy.config.js

  ${chalk.gray("# 生成配置文件模板")}
  ${chalk.green("proxy init")}
`);
}

function printVersion() {
  const versionBox = boxen(
    `${gradient.rainbow("Web Proxy CLI")} ${chalk.cyan(`v${PACKAGE_VERSION}`)}`,
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
    }
  );
  console.log(versionBox);
}

async function initConfig() {
  const configPath = resolve(process.cwd(), "proxy.config.js");
  
  if (existsSync(configPath)) {
    console.error(chalk.red.bold("❌ proxy.config.js 已存在！"));
    process.exit(1);
  }

  const template = `export default {
  // 监听端口
  port: 8000,
  // 代理目标地址
  target: 'http://example.com',
  // 是否启用日志
  logger: true,
  // 请求超时时间（毫秒）
  timeout: 30000,
};
`;

  const fs = await import("node:fs/promises");
  await fs.writeFile(configPath, template, "utf-8");
  
  const successBox = boxen(
    `${chalk.green.bold("✅ 配置文件创建成功！")}\n\n` +
    `文件位置: ${chalk.cyan(configPath)}\n` +
    `下一步: ${chalk.yellow("编辑配置文件后运行")} ${chalk.green("proxy start")}`,
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "green",
    }
  );
  console.log(successBox);
}

async function loadConfig(configPath?: string): Promise<Partial<ProxyConfig>> {
  const configFile = configPath || join(process.cwd(), "proxy.config.js");
  
  if (!existsSync(configFile)) {
    return {};
  }

  try {
    // 动态导入配置文件
    const configModule = await import(`file://${resolve(configFile)}`);
    return configModule.default || configModule;
  } catch (error) {
    console.error(chalk.red.bold(`❌ 加载配置文件失败: ${configFile}`));
    console.error(chalk.gray(String(error)));
    return {};
  }
}

export async function main() {
  const args = process.argv.slice(2);

  // 处理命令
  const command = args[0];
  
  if (command === "init") {
    await initConfig();
    return;
  }

  if (command === "-v" || command === "--version") {
    printVersion();
    return;
  }

  if (command === "-h" || command === "--help") {
    printHelp();
    return;
  }

  // 过滤掉 'start' 命令
  const commandArgs = command === "start" ? args.slice(1) : args;

  // 解析命令行参数
  const { values } = parseArgs({
    args: commandArgs,
    options: {
      port: { type: "string", short: "p" },
      target: { type: "string", short: "t" },
      config: { type: "string", short: "c" },
      logger: { type: "boolean", default: true },
      timeout: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    return;
  }

  if (values.version) {
    printVersion();
    return;
  }

  // 加载配置文件
  const fileConfig = await loadConfig(values.config as string | undefined);

  // 合并配置：命令行参数 > 配置文件 > 默认值
  const config: ProxyConfig = {
    port: Number(values.port) || fileConfig.port || 8000,
    target: (values.target as string) || fileConfig.target || "",
    logger: values.logger !== false && (fileConfig.logger !== false),
    timeout: Number(values.timeout) || fileConfig.timeout || 30000,
  };

  // 验证必填参数
  if (!config.target) {
    const errorBox = boxen(
      `${chalk.red.bold("❌ 错误: --target 参数是必填的")}\n\n` +
      `${chalk.yellow("提示:")} 使用 ${chalk.cyan("proxy --help")} 查看使用说明\n\n` +
      `${chalk.cyan.bold("快速开始:")}\n` +
      `  ${chalk.green("proxy")} ${chalk.magenta("--port")} 8000 ${chalk.magenta("--target")} http://example.com`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "red",
      }
    );
    console.log(errorBox);
    process.exit(1);
  }

  // 验证 target URL
  try {
    new URL(config.target);
  } catch {
    const errorBox = boxen(
      `${chalk.red.bold("❌ 无效的目标地址")}\n\n` +
      `地址: ${chalk.yellow(config.target)}\n\n` +
      `${chalk.cyan("正确格式:")} http://example.com 或 https://example.com`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "red",
      }
    );
    console.log(errorBox);
    process.exit(1);
  }

  // 启动服务器
  const server = createProxyServer(config);

  // 优雅退出
  const shutdown = () => {
    console.log("\n" + chalk.yellow.bold("👋 正在关闭代理服务器..."));
    server.close(() => {
      console.log(chalk.green.bold("✅ 服务器已安全关闭"));
      console.log(chalk.gray("感谢使用 Web Proxy CLI！\n"));
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const errorBox = boxen(
      `${chalk.red.bold("💥 致命错误")}\n\n${chalk.gray(String(error))}`,
      {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: "red",
      }
    );
    console.log(errorBox);
    process.exit(1);
  });
}
