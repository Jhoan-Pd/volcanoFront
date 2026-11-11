/**
 * Server-Sent Events reader on top of fetch.
 *
 * EventSource (the native API) only does GET and cannot send headers, while training is a POST that
 * carries the administrator's token. The response body is read as a ReadableStream and split into
 * events following the text/event-stream format ("event:", "data:" and a blank line after each event).
 */
export interface SseEvent<T = unknown> {
  event: string;
  data: T;
}

export class SseError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function* readSse<T>(url: string, init: RequestInit = {}): AsyncGenerator<SseEvent<T>> {
  const r = await fetch(url, { ...init, headers: { Accept: "text/event-stream", ...init.headers } });
  if (!r.ok || !r.body) {
    // Before the stream opens the API answers regular JSON errors (409, 403, 503…)
    let message = `Error ${r.status}`;
    let code: string | undefined;
    try {
      const body = await r.json();
      message = body?.error?.message ?? message;
      code = body?.error?.code;
    } catch { /* no JSON body */ }
    throw new SseError(r.status, message, code);
  }
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += value;
      let cut: number;
      while ((cut = pending.search(/\r?\n\r?\n/)) >= 0) {
        const block = pending.slice(0, cut);
        pending = pending.slice(cut).replace(/^\r?\n\r?\n/, "");
        let event = "message";
        const data: string[] = [];
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith(":")) continue; // comment (keepalive)
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        }
        if (data.length) yield { event, data: JSON.parse(data.join("\n")) as T };
      }
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}
