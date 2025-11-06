// Cloudflare Workers 代理服务
// 支持请求体字符串替换和流式响应转发

// 替换规则配置（从 req-replace.json 迁移）
const REPLACE_RULES = {
  "Create one with `update_todo_list` if your task is complicated or involves multiple steps.": 
  "Create one with `update_todo_list`  if your task is complicated or involves multiple steps.",
  "Always use the actual tool name as the XML tag name for proper parsing and execution.":
  "Always use the  actual tool name  as the  XML tag name  for proper parsing and execution.",
  "You are Kilo Code, a highly skilled software engineer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.":
  "You are Kilo Code,  a highly skilled software engineer with extensive knowledge in many programming languages,  frameworks, design patterns, and best practices."
};

// 应用字符串替换
function applyReplacements(body) {
  let result = body;
  for (const [key, value] of Object.entries(REPLACE_RULES)) {
    result = result.split(key).join(value);
  }
  return result;
}

export default {
  async fetch(request, env) {
    const BASE_URL = env.BASE_URL || 'https://droid.747671555.workers.dev';
    
    try {
      // 解析请求 URL
      const url = new URL(request.url);
      const targetUrl = new URL(url.pathname + url.search, BASE_URL);
      
      console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`);
      
      // 处理请求体
      let body = null;
      let modifiedBody = null;
      
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text();
        
        if (body) {
          modifiedBody = applyReplacements(body);
          console.log(`[Replaced] Request body processed with ${Object.keys(REPLACE_RULES).length} rule(s)`);
        }
      }
      
      // 构建转发请求的 headers
      const headers = new Headers(request.headers);
      headers.set('host', targetUrl.host);
      
      if (modifiedBody) {
        headers.set('content-length', new Blob([modifiedBody]).size.toString());
      }
      
      // 发起代理请求
      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: modifiedBody || (request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null),
      });
      
      const response = await fetch(proxyRequest);
      
      console.log(`[Response] ${response.status} ${url.pathname}`);
      
      // 返回响应（自动支持流式传输）
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
    } catch (error) {
      console.error(`[Error] ${error.message}`);
      return new Response(`Proxy Error: ${error.message}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
};