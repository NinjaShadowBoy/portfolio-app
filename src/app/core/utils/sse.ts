/** One server-sent event, already decoded from the stream's bytes. */
export interface SseEvent {
  event: string;
  data: string;
}

/**
 * Parses a `text/event-stream` body into events. Chunks may split anywhere,
 * including inside a UTF-8 character; `TextDecoder({ stream: true })` holds the
 * partial sequence until the next chunk. Comment lines (`: ping`) and the
 * `id`/`retry` fields are ignored, and multi-line `data:` fields are joined
 * with a newline.
 */
export async function* parseSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = '';
  let data: string[] = [];

  const take = (): SseEvent | null => {
    if (!data.length) {
      event = '';
      return null;
    }
    const payload = { event: event || 'message', data: data.join('\n') };
    event = '';
    data = [];
    return payload;
  };

  const readLine = (line: string): SseEvent | null => {
    if (line === '') return take();
    if (line.startsWith(':')) return null; // comment / keep-alive
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
    return null;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        const payload = readLine(line);
        if (payload) yield payload;
      }

      if (done) break;
    }

    // A server that closes without the final blank line still sent the event.
    const payload = take();
    if (payload) yield payload;
  } finally {
    reader.releaseLock();
  }
}
