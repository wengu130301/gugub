/**
 * LaswI ID 登录页 · CORS 转发（Cloudflare Worker）
 *
 * 用途：当 rtuser.rtstudio.top 尚未把 https://gubrowser.laswi.com.cn
 * 加入 CORS 白名单时，用本 Worker 做同源转发，页面侧以
 *   https://<你的worker域名>/api  作为 ?api= 或 window.__LASWI_API__ 的值。
 *
 * 安全约束（务必保留）：
 *  1. 仅放行白名单 Origin，避免成为公共开放代理；
 *  2. 仅放行 /api/auth/ 下 3 个必要端点，其余一律 403；
 *  3. 不落盘、不打印请求体（含密码），日志只记路径与状态码。
 *
 * 部署：
 *   npx wrangler deploy proxy/worker.js --name laswi-id-proxy
 */

const UPSTREAM = "https://rtuser.rtstudio.top";

const ALLOW_ORIGINS = [
  "https://gubrowser.laswi.com.cn",
  "https://gubrowser.pages.dev",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

const ALLOW_PATHS = new Set([
  "/api/auth/verify-login-key",
  "/api/auth/verify-software-token",
  "/api/auth/software-login",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (!ALLOW_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ success: false, message: "origin not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ success: false, message: "method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    if (!ALLOW_PATHS.has(url.pathname)) {
      return new Response(JSON.stringify({ success: false, message: "path not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const body = await request.text();

    const upstream = await fetch(UPSTREAM + url.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await upstream.text();
    console.log(JSON.stringify({ path: url.pathname, status: upstream.status }));

    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...corsHeaders(origin),
      },
    });
  },
};
