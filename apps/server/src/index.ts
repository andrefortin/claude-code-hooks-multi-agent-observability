import { initDatabase, insertEvent, getFilterOptions, getRecentEvents, updateEventHITLResponse } from './db';

import type { HookEvent, HumanInTheLoopResponse } from './types';

import { spawn } from 'bun';

import {
  createTheme,
  updateThemeById,
  getThemeById,
  searchThemes,
  deleteThemeById,
  exportThemeById,
  importTheme,
  getThemeStats
} from './theme';

// TTS Generation Function
async function generateTTS(text: string, provider: 'elevenlabs' | 'openai' | 'pyttsx3'): Promise<Uint8Array> {
  if (!text || !text.trim()) {
    throw new Error('Text is required for TTS');
  }

  const basePath = `${process.cwd()}/.claude/hooks/utils/tts/`;
  const script = provider === 'elevenlabs' ? 'elevenlabs_tts.py' : provider === 'openai' ? 'openai_tts.py' : 'pyttsx3_tts.py';
  const scriptPath = `${basePath}${script}`;
  const outputFile = `/tmp/tts_${Date.now()}.${provider === 'pyttsx3' ? 'wav' : 'mp3'}`;
  const args = [text, '--output', outputFile];

  // Check API keys
  if (provider === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is missing in .env');
  }
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in .env');
  }

  const proc = spawn(['uv', 'run', scriptPath, ...args], {
    cwd: basePath,
    stdout: 'inherit',
    stderr: 'pipe',
  });

  const code = await proc.exited;
  
  if (code !== 0) {
    const file = Bun.file(outputFile);
    if (await file.exists()) await Bun.write(outputFile, '');
    throw new Error(`TTS script failed with code ${code}`);
  }
  
  const file = Bun.file(outputFile);
  if (!(await file.exists()) || (await file.size) === 0) {
    throw new Error('TTS audio file not generated or empty');
  }
  
  const buffer = await file.arrayBuffer();
  await Bun.write(outputFile, ''); // Clean up
  return new Uint8Array(buffer);
}

// Global WebSocket clients tracking
import type { ServerWebSocket } from 'bun';
let connectedClients: Set<ServerWebSocket<unknown>> = new Set();

// Broadcast function for new events
function broadcastEvent(event: HookEvent) {
  const message = JSON.stringify({ type: 'event', data: event });
  for (const client of connectedClients) {
    try {
      client.send(message);
    } catch (error) {
      connectedClients.delete(client);
    }
  }
}


// Initialize database
await initDatabase();

// Theme route handler
async function handleThemeRoutes(req: Request): Promise<Response> {
  const { pathname, searchParams } = new URL(req.url);
  const segments = pathname.split('/').filter(Boolean);
  const id = segments[2]; // assuming /themes/:id

  try {
    switch (req.method) {
      case 'POST':
        if (pathname === '/themes') {
          const body = await req.json();
          return Response.json(await createTheme(body));
        } else if (pathname === '/themes/import') {
          const body = await req.json();
          return Response.json(await importTheme(body));
        } else if (pathname.startsWith('/themes/') && pathname.endsWith('/export')) {
          return Response.json(await exportThemeById(id!));
        }
        break;
      case 'PUT':
        if (pathname.startsWith('/themes/') && id) {
          const body = await req.json();
          return Response.json(await updateThemeById(id, body));
        }
        break;
      case 'GET':
        if (pathname === '/themes') {
          const q = searchParams.get('q') || '';
          return Response.json(await searchThemes({ query: q }));
        } else if (pathname.startsWith('/themes/') && id) {
          return Response.json(await getThemeById(id));
        } else if (pathname === '/themes/stats') {
          return Response.json(await getThemeStats());
        }
        break;
      case 'DELETE':
        if (pathname.startsWith('/themes/') && id) {
          await deleteThemeById(id);
          return new Response(null, { status: 204 });
        }
        break;
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }

  if (pathname === '/tts' && req.method === 'POST') {
      try {
        const body = await req.json() as { text: string; provider: 'elevenlabs' | 'openai' | 'pyttsx3' };
        const { text, provider } = body;
        if (!text || !provider) {
          return new Response(JSON.stringify({ error: 'Missing text or provider' }), { status: 400 });
        }
        const audioData = await generateTTS(text, provider);
        return new Response(audioData, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioData.length.toString()
          }
        });
      } catch (error) {
        console.error('TTS error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });

}

// Start server
const server = Bun.serve({
  port: 4000,
  async fetch(req: Request): Promise<Response | undefined> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(req.url);

    // WebSocket upgrade for /stream
    if (url.pathname === '/stream' && req.headers.get('upgrade') === 'websocket') {
      if (server.upgrade(req, { data: {} })) {
        return undefined; // Upgraded, no response
      }
      return new Response('Upgrade failed', { status: 400 });
    }

    // HTTP routes
    if (url.pathname === '/health') {
      return new Response('OK', { headers: corsHeaders });
    }

    if (url.pathname === '/events/filter-options' && req.method === 'GET') {
      return Response.json(getFilterOptions(), { headers: corsHeaders });
    }

    if (url.pathname === '/events/recent' && req.method === 'GET') {
      return Response.json(await getRecentEvents(), { headers: corsHeaders });
    }

    if (url.pathname === '/events' && req.method === 'POST') {
      try {
        const body = await req.json() as HookEvent;
        const result = await insertEvent(body);
        if (result) {
          broadcastEvent(body);
        }
        return Response.json({ id: result }, { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
      }
    }

    if (url.pathname.startsWith('/themes')) {
      const themeResponse = await handleThemeRoutes(req);
  if (themeResponse.headers) {
    themeResponse.headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
    // Add other CORS headers if needed
  }
  return themeResponse;
    }

    if (url.pathname === '/tts' && req.method === 'POST') {
      try {
        const body = await req.json() as { text: string; provider: 'elevenlabs' | 'openai' | 'pyttsx3' };
        const { text, provider } = body;
        if (!text || !provider) {
          return new Response(JSON.stringify({ error: 'Missing text or provider' }), { status: 400 });
        }
        const audioData = await generateTTS(text, provider);
        return new Response(audioData, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioData.length.toString()
          }
        });
      } catch (error) {
        console.error('TTS error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });

  },
  websocket: {
    open(ws: ServerWebSocket<unknown>) {
      connectedClients.add(ws);
      // Don't send initial here; wait for subscribe
    },

    message(ws: ServerWebSocket<unknown>, message: string | Buffer) {
      if (typeof message !== 'string') return;

      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe') {
          const limit = data.limit || 1000;
          // Send initial events with client-specified limit
          (async () => {
            try {
              const events = await getRecentEvents(Math.min(limit, 5000)); // Cap at 5000 for safety
              ws.send(JSON.stringify({ type: 'initial', data: events }));
              console.log(`Sent ${events.length} initial events for limit ${limit}`);
            } catch (err) {
              console.error('Failed to send initial events:', err);
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to load events' }));
            }
          })();
          ws.send(JSON.stringify({ type: 'subscribed' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    },
    message(ws: ServerWebSocket<unknown>, message: string | Buffer) {
      if (typeof message !== 'string') return;

      try {
        const data = JSON.parse(message.toString());
          } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    },
    close(ws: ServerWebSocket<unknown>, code: number, reason: string) {
      connectedClients.delete(ws);
    },
  },
});

console.log(`Server running on http://localhost:${server.port}`);

// ... rest of file ...