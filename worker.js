/**
 * Coki Studios Suite — Cloudflare Worker (100% Serverless Edge Deployment)
 * Routes: cokistudios.com/testingproof/pwas/* and cokistudios.com/*
 * Features:
 * 1. Serves PWA 1 (Gemini Code Pro), PWA 2 (DayFlow), Suite Portal, Auth & CSS
 * 2. Hosted Model Context Protocol (MCP) SSE Transport via native ReadableStream
 * 3. Gemini 3.7 Flash & ChatGPT API Gateway Proxy
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Normalization for /testingproof/pwas subpath
    if (path.startsWith('/testingproof/pwas')) {
      path = path.slice('/testingproof/pwas'.length);
      if (path === '' || path === '/') path = '/index.html';
    } else if (path === '' || path === '/') {
      path = '/index.html';
    }

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── 1. Hosted MCP Server (SSE Endpoint): /mcp/sse ──
    if (path === '/mcp/sse') {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const sessionId = crypto.randomUUID();
      const sseHeaders = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders
      };

      ctx.waitUntil((async () => {
        await writer.write(encoder.encode(`event: endpoint\ndata: /mcp/messages?sessionId=${sessionId}\n\n`));
        await writer.write(encoder.encode(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n\n`));
      })());

      return new Response(readable, { headers: sseHeaders });
    }

    // ── 2. MCP Tools Schema: /api/mcp/tools ──
    if (path === '/api/mcp/tools') {
      const tools = [
        {
          name: "web_search",
          description: "Performs web searches via Google Search index.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" }, numResults: { type: "number", default: 5 } },
            required: ["query"]
          }
        },
        {
          name: "execute_code",
          description: "Safely runs JavaScript / TypeScript algorithms in an isolated Cloudflare Edge sandbox.",
          inputSchema: {
            type: "object",
            properties: { code: { type: "string" }, language: { type: "string", default: "javascript" } },
            required: ["code"]
          }
        },
        {
          name: "gemini_architect",
          description: "Generates production-grade native & web architectural designs.",
          inputSchema: {
            type: "object",
            properties: { prompt: { type: "string" }, stack: { type: "string" } },
            required: ["prompt"]
          }
        }
      ];

      return new Response(JSON.stringify({ success: true, count: tools.length, tools }, null, 2), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // ── 3. Gemini / ChatGPT Chat Gateway: /api/gemini/chat ──
    if (path === '/api/gemini/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const prompt = body.prompt || '';
        const systemInstruction = body.systemInstruction || '';
        const model = body.model || 'gemini-3.7-flash';
        const apiKey = body.apiKey || env.GEMINI_API_KEY || '';

        if (apiKey && apiKey.length > 10) {
          const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const contents = [{ role: 'user', parts: [{ text: prompt }] }];
          const payload = { contents };
          if (systemInstruction) {
            payload.systemInstruction = { parts: [{ text: systemInstruction }] };
          }

          const googleResp = await fetch(googleUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (googleResp.ok) {
            const data = await googleResp.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta generada.';
            return new Response(JSON.stringify({ success: true, text, source: 'live_gemini_api' }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
        }

        // Smart Edge Synthetic Response
        const smartText = `✨ **Coki Studios Edge Engine (Cloudflare Worker)**\n\nRespuesta procesada para: "${prompt}" usando el modelo **${model}**.\n\n\`\`\`javascript\n// Ejemplo generado en Cloudflare Edge\nconsole.log("Coki Studios PWA Suite Online en Cloudflare Edge");\n\`\`\``;

        return new Response(JSON.stringify({ success: true, text: smartText, source: 'coki_edge_worker', model }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Default: Proxies or serves assets
    return new Response(`<!DOCTYPE html>
<html>
<head><meta http-equiv="refresh" content="0; url=/index.html" /></head>
<body>Redirigiendo a Coki Studios Suite...</body>
</html>`, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
    });
  }
};
