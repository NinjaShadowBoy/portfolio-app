import { LOCALE_ID, PLATFORM_ID, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatService } from './chat.service';
import { ChatUiService } from '../../core/services/chat-ui.service';
import { AuthService } from '../../core/services/auth.service';

const encoder = new TextEncoder();
const doneFrame = 'event: done\ndata: {"remainingToday":null}\n\n';

function sse(frames: string[]): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(frames.join('')));
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );
}

function jsonError(status: number, code: string, headers: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ timestamp: 'now', status, error: 'x', code, message: 'x' }),
    { status, headers: { 'Content-Type': 'application/json', ...headers } },
  );
}

function requestBody(call: unknown[]): { locale: string; pagePath: string; messages: { role: string; text: string }[] } {
  return JSON.parse((call[1] as RequestInit).body as string);
}

describe('ChatService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.resetTestingModule();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  function setup(options: { providers?: Provider[]; url?: string } = {}): ChatService {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(options.providers ?? []),
      ],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue(options.url ?? '/');
    const chat = TestBed.inject(ChatService);
    TestBed.tick();
    return chat;
  }

  it('accumulates text deltas and records the remaining quota', async () => {
    fetchMock.mockResolvedValue(
      sse([
        'event: text\ndata: {"text":"Hel"}\n\n',
        'event: text\ndata: {"text":"lo"}\n\n',
        'event: done\ndata: {"remainingToday":7}\n\n',
      ]),
    );
    const chat = setup();

    await chat.send('Hi');

    expect(chat.messages().at(-1)).toMatchObject({ role: 'assistant', text: 'Hello' });
    expect(chat.status()).toBe('idle');
    expect(chat.remainingToday()).toBe(7);
  });

  it('sets the tool status while a tool runs and clears it afterwards', async () => {
    let body!: ReadableStreamDefaultController<Uint8Array>;
    fetchMock.mockResolvedValue(
      new Response(new ReadableStream<Uint8Array>({ start: (controller) => (body = controller) }), {
        status: 200,
      }),
    );
    const chat = setup();

    const sent = chat.send('Hi');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    body.enqueue(encoder.encode('event: tool\ndata: {"name":"search_site"}\n\n'));
    await vi.waitFor(() => expect(chat.toolStatus()).toBe('Searching the site...'));

    body.enqueue(encoder.encode(doneFrame));
    body.close();
    await sent;

    expect(chat.toolStatus()).toBeNull();
  });

  it('attaches links from a links event to the answer', async () => {
    fetchMock.mockResolvedValue(
      sse([
        'event: links\ndata: {"links":[{"title":"Proj","url":"/projects/12","kind":"project"}]}\n\n',
        doneFrame,
      ]),
    );
    const chat = setup();

    await chat.send('Hi');

    expect(chat.messages().at(-1)?.links).toEqual([
      { title: 'Proj', url: '/projects/12', kind: 'project' },
    ]);
  });

  it('hands a move event to the mascot', async () => {
    fetchMock.mockResolvedValue(sse(['event: move\ndata: {"name":"flip"}\n\n', doneFrame]));
    const chat = setup();

    await chat.send('What is your name?');

    expect(TestBed.inject(ChatUiService).move()?.name).toBe('flip');
  });

  it('sets the error status from an error event', async () => {
    fetchMock.mockResolvedValue(sse(['event: error\ndata: {"code":"internal"}\n\n']));
    const chat = setup();

    await chat.send('Hi');

    expect(chat.status()).toBe('error');
    expect(chat.messages().at(-1)?.error).toBe('Something went wrong. Please try again.');
  });

  it('maps a streamed limited error to the limited status', async () => {
    fetchMock.mockResolvedValue(sse(['event: error\ndata: {"code":"limited"}\n\n']));
    const chat = setup();

    await chat.send('Hi');

    expect(chat.status()).toBe('limited');
  });

  const errorCases: [string, number, string][] = [
    ['CHAT_DISABLED', 404, 'disabled'],
    ['CHAT_LIMITED', 429, 'limited'],
    ['RATE_LIMITED', 429, 'error'],
    ['CHAT_BUSY', 429, 'error'],
    ['ORIGIN_NOT_ALLOWED', 403, 'error'],
    ['VALIDATION_ERROR', 400, 'error'],
    ['INTERNAL_ERROR', 500, 'error'],
    ['CHAT_TIMEOUT', 504, 'error'],
  ];

  it.each(errorCases)('maps the pre-stream %s error (HTTP %s) to %s', async (code, httpStatus, expected) => {
    fetchMock.mockResolvedValue(jsonError(httpStatus, code, { 'Retry-After': '42' }));
    const chat = setup();

    await chat.send('Hi');

    expect(chat.status()).toBe(expected);
    if (code === 'CHAT_LIMITED') {
      expect(chat.retryAfter()).toBe(42);
      expect(chat.messages()).toHaveLength(1); // no empty bubble; the pane shows the notice
    }
  });

  it('hides chat when the API says it is disabled', async () => {
    fetchMock.mockResolvedValue(jsonError(404, 'CHAT_DISABLED'));
    const chat = setup();
    const chatUi = TestBed.inject(ChatUiService);
    chatUi.setAvailable(true);

    await chat.send('Hi');

    expect(chatUi.available()).toBe(false);
  });

  it('aborts the request when stop() is called', async () => {
    let signal!: AbortSignal;
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal = init.signal as AbortSignal;
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    const chat = setup();

    const sent = chat.send('Hi');
    await vi.waitFor(() => expect(signal).toBeDefined());
    chat.stop();
    await sent;

    expect(signal.aborted).toBe(true);
    expect(chat.status()).toBe('idle');
  });

  it('restores the conversation from sessionStorage', () => {
    sessionStorage.setItem(
      'chat.conversation',
      JSON.stringify([
        { role: 'user', text: 'Hi' },
        { role: 'assistant', text: 'Hello' },
      ]),
    );

    const chat = setup();

    expect(chat.messages()).toEqual([
      { role: 'user', text: 'Hi' },
      { role: 'assistant', text: 'Hello' },
    ]);
  });

  it('persists the conversation and clears it with clear()', async () => {
    fetchMock.mockResolvedValue(sse([doneFrame]));
    const chat = setup();

    await chat.send('Hi');
    TestBed.tick();
    expect(sessionStorage.getItem('chat.conversation')).toContain('Hi');

    chat.clear();
    TestBed.tick();
    expect(chat.messages()).toEqual([]);
    expect(sessionStorage.getItem('chat.conversation')).toBeNull();
  });

  it('sends only the last 12 messages, each capped at 1000 characters', async () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 ? 'assistant' : 'user',
      text: index === 19 ? 'a'.repeat(2000) : `m${index}`,
    }));
    sessionStorage.setItem('chat.conversation', JSON.stringify(history));
    fetchMock.mockResolvedValue(sse([doneFrame]));
    const chat = setup();

    await chat.send('new');

    const body = requestBody(fetchMock.mock.calls[0]);
    expect(body.messages).toHaveLength(12);
    expect(body.messages.at(-1)).toEqual({ role: 'user', text: 'new' });
    expect(Math.max(...body.messages.map((message) => message.text.length))).toBe(1000);
  });

  it('sends the locale and the page path without the locale prefix', async () => {
    fetchMock.mockResolvedValue(sse([doneFrame]));
    const chat = setup({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }], url: '/fr/projects/12?tab=1' });

    await chat.send('Bonjour');

    const body = requestBody(fetchMock.mock.calls[0]);
    expect(body.locale).toBe('fr');
    expect(body.pagePath).toBe('/projects/12');
  });

  it('adds the bearer token only when logged in', async () => {
    fetchMock.mockResolvedValue(sse([doneFrame]));
    const chat = setup();
    const auth = TestBed.inject(AuthService);

    await chat.send('one');
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty('Authorization');

    auth.setSession({
      token: 'jwt',
      expiresIn: 3_600_000,
      user: {
        id: 1,
        email: 'a@b.c',
        name: 'A',
        role: 'USER',
        createdAt: '2026-01-01T00:00:00Z',
        lastLoginAt: '2026-01-01T00:00:00Z',
      },
    });
    await chat.send('two');
    expect(((fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>)['Authorization']).toBe(
      'Bearer jwt',
    );
  });

  it('does nothing on the server', async () => {
    const chat = setup({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });

    await chat.send('Hi');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(chat.messages()).toEqual([]);
    expect(sessionStorage.getItem('chat.conversation')).toBeNull();
  });

  it('reports offline when the browser is offline', async () => {
    const chat = setup();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    await chat.send('Hi');

    expect(chat.status()).toBe('offline');
    expect(chat.messages().at(-1)?.error).toContain('offline');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a fetch TypeError to offline', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const chat = setup();

    await chat.send('Hi');

    expect(chat.status()).toBe('offline');
  });

  it('loads the config into available and remainingToday', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ enabled: true, remainingToday: 4 }), { status: 200 }),
    );
    setup();
    const chatUi = TestBed.inject(ChatUiService);

    await chatUi.loadConfig();

    expect(chatUi.available()).toBe(true);
    expect(chatUi.remainingToday()).toBe(4);
  });

  it('leaves chat unavailable when the config call fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    setup();
    const chatUi = TestBed.inject(ChatUiService);

    await chatUi.loadConfig();

    expect(chatUi.available()).toBe(false);
  });
});
