/**
 * 代理服务器配置
 */
export interface ProxyConfig {
  /** 代理服务器监听端口 */
  port: number;
  /** 目标网站 URL */
  target: string;
  /** 是否启用日志 */
  logger?: boolean;
  /** 请求超时时间（毫秒） */
  timeout?: number;
}
