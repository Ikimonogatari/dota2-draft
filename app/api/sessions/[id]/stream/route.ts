import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const enc = new TextEncoder();
  let ctrl: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      ctrl = c;
      const session = store.sessions.get(id);
      if (session) {
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify(session)}\n\n`));
      }
      store.subscribe(id, ctrl);
    },
    cancel() {
      store.unsubscribe(id, ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
