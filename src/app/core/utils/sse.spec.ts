import { SseEvent, parseSse } from './sse';

const encoder = new TextEncoder();

function streamOf(...chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  for await (const event of parseSse(stream)) events.push(event);
  return events;
}

describe('parseSse', () => {
  it('yields events from chunks split mid-frame', async () => {
    const events = await collect(
      streamOf('event: text\nda', 'ta: {"text":"Hel"}\n\n', 'event: done\ndata: {"remainingToday":3}\n\n'),
    );

    expect(events).toEqual([
      { event: 'text', data: '{"text":"Hel"}' },
      { event: 'done', data: '{"remainingToday":3}' },
    ]);
  });

  it('keeps a multibyte character split across two chunks intact', async () => {
    const bytes = encoder.encode('data: héllo wörld\n\n');
    // Cut inside the two-byte "é" (0xC3 0xA9).
    const cut = bytes.indexOf(0xc3) + 1;
    expect(bytes[cut - 1]).toBe(0xc3);

    const events = await collect(streamOf(bytes.slice(0, cut), bytes.slice(cut)));

    expect(events).toEqual([{ event: 'message', data: 'héllo wörld' }]);
  });

  it('joins multi-line data fields with a newline', async () => {
    const events = await collect(streamOf('event: text\ndata: first\ndata: second\n\n'));

    expect(events).toEqual([{ event: 'text', data: 'first\nsecond' }]);
  });

  it('handles CRLF line endings', async () => {
    const events = await collect(streamOf('event: text\r\ndata: hi\r\n\r\n'));

    expect(events).toEqual([{ event: 'text', data: 'hi' }]);
  });

  it('ignores ping comments and yields only real events', async () => {
    const events = await collect(streamOf(': ping\n\n', ': keep-alive\nevent: text\ndata: ok\n\n'));

    expect(events).toEqual([{ event: 'text', data: 'ok' }]);
  });
});
