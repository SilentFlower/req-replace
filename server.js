const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'rr-config.json'), 'utf8'));
const replaceRules = JSON.parse(fs.readFileSync(path.join(__dirname, 'req-replace.json'), 'utf8'));

const PORT = config.port || 3030;
const BASE_URL = config.base_url || 'https://droid.747671555.workers.dev';

function applyReplacements(body) {
  let result = body;
  for (const [key, value] of Object.entries(replaceRules)) {
    result = result.split(key).join(value);
  }
  return result;
}

const server = http.createServer((clientReq, clientRes) => {
  console.log(`[${new Date().toISOString()}] ${clientReq.method} ${clientReq.url}`);

  // 健康检查端点
  if (clientReq.url === '/' || clientReq.url === '/health') {
    clientRes.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    clientRes.end(JSON.stringify({
      status: 'ok',
      service: 'req-replace proxy',
      target: BASE_URL,
      rules: Object.keys(replaceRules).length,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  let body = [];

  clientReq.on('data', (chunk) => {
    body.push(chunk);
  });

  clientReq.on('end', () => {
    let bodyString = Buffer.concat(body).toString();

    if (bodyString) {
      bodyString = applyReplacements(bodyString);
      console.log(`[Replaced] Request body processed with ${Object.keys(replaceRules).length} rule(s)`);
    }

    const targetUrl = new URL(clientReq.url, BASE_URL);
    const isHttps = targetUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const headers = { ...clientReq.headers };
    headers['host'] = targetUrl.host;
    
    if (bodyString) {
      headers['content-length'] = Buffer.byteLength(bodyString);
    }

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: clientReq.method,
      headers: headers
    };

    const proxyReq = httpModule.request(options, (proxyRes) => {
      console.log(`[Response] ${proxyRes.statusCode} ${clientReq.url}`);

      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);

      proxyRes.pipe(clientRes);
    });

    proxyReq.on('error', (err) => {
      console.error(`[Error] ${err.message}`);
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      clientRes.end(`Proxy Error: ${err.message}`);
    });

    if (bodyString) {
      proxyReq.write(bodyString);
    }

    proxyReq.end();
  });

  clientReq.on('error', (err) => {
    console.error(`[Client Error] ${err.message}`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
    }
    clientRes.end(`Client Request Error: ${err.message}`);
  });
});

server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`Proxy Server Running`);
  console.log(`Listening on: http://127.0.0.1:${PORT}`);
  console.log(`Forwarding to: ${BASE_URL}`);
  console.log(`Replace rules: ${Object.keys(replaceRules).length} rule(s) loaded`);
  console.log(`===========================================`);
});

server.on('error', (err) => {
  console.error(`Server Error: ${err.message}`);
  process.exit(1);
});
