import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: path.startsWith("/api/") ? "application/json" : "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the StraitSignal intelligence dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>StraitSignal/);
  assert.match(html, /Oil futures signal fusion/);
  assert.match(html, /Chokepoint movement intelligence/);
  assert.match(html, /Model disagreement is a feature/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("serves a labeled intelligence snapshot", async () => {
  const response = await render("/api/intel");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.mode, /^(live|hybrid|demo)$/);
  assert.ok(Array.isArray(body.sources));
  assert.ok(Array.isArray(body.timeline.observed));
  assert.equal(body.polls.cycle, "2026 U.S. midterms");
});
