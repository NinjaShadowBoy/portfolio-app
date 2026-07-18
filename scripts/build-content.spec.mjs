// Unit / integration tests for the content build script (scripts/build-content.mjs).
//
// Run with:  node --test scripts/build-content.spec.mjs
//
// These tests are intentionally BLACK-BOX: they invoke the real build script
// once against the checked-in fixtures under src/content/articles/** (authored
// in task BP0) and then assert on the generated artefacts it emits into
// src/generated/**. They are decoupled from the script's internal function
// signatures so BP2 is free to refactor as long as the documented output
// contract (typed manifest, per-article payloads, sitemap.xml, rss.xml) holds.
//
// Coverage (per plan task BP5):
//   - frontmatter parse of the BP0 fixtures
//   - reading-time calculation
//   - TOC extraction from heading anchors
//   - missing-fr graceful fallback (the en-only slug)
//   - draft exclusion (draft-sample absent from manifest / sitemap / rss)
//   - sitemap + rss omit drafts and carry hreflang alternates

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const buildScript = path.join(repoRoot, 'scripts', 'build-content.mjs');
const generatedDir = path.join(repoRoot, 'src', 'generated');
const manifestPath = path.join(generatedDir, 'articles-manifest.ts');
const articlesOutDir = path.join(generatedDir, 'articles');
const publicOutDir = path.join(generatedDir, 'public');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Absolute path to a per-article payload JSON. */
function payloadPath(slug, lang) {
  return path.join(articlesOutDir, `${slug}.${lang}.json`);
}

/** Read + JSON-parse a per-article payload. */
function readPayload(slug, lang) {
  return JSON.parse(readFileSync(payloadPath(slug, lang), 'utf8'));
}

/** Read a generated public asset (sitemap.xml / rss.xml) as text. */
function readPublic(name) {
  return readFileSync(path.join(publicOutDir, name), 'utf8');
}

/**
 * Parse the generated typed manifest (a .ts module) into a plain JS array.
 * The manifest is emitted as `.ts` (not `.json`) because tsconfig lacks
 * resolveJsonModule; the array literal itself is plain data, so we isolate it
 * between the first `[` after the `=` and the final `]` and evaluate it.
 */
function readManifest() {
  const text = readFileSync(manifestPath, 'utf8');
  const eq = text.indexOf('=');
  assert.ok(eq !== -1, 'manifest should contain an exported const assignment');
  const start = text.indexOf('[', eq);
  const end = text.lastIndexOf(']');
  assert.ok(
    start !== -1 && end !== -1 && end > start,
    'manifest should contain an array literal',
  );
  const arrayLiteral = text.slice(start, end + 1);
  // eslint-disable-next-line no-new-func
  const value = new Function(`return (${arrayLiteral});`)();
  assert.ok(Array.isArray(value), 'manifest export should be an array');
  return value;
}

/** Find a manifest entry by slug. */
function entry(manifest, slug) {
  return manifest.find((a) => a && a.slug === slug);
}

/** Flatten a (possibly nested) TOC tree into a flat list of nodes. */
function flattenToc(toc) {
  const out = [];
  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (n && typeof n === 'object') {
        out.push(n);
        walk(n.children ?? n.items ?? n.nodes);
      }
    }
  };
  walk(toc);
  return out;
}

/** Extract the TOC array from a payload regardless of its exact field name. */
function tocOf(payload) {
  return payload.toc ?? payload.tableOfContents ?? payload.headings ?? [];
}

/** Extract the rendered HTML body from a payload regardless of field name. */
function bodyOf(payload) {
  return payload.html ?? payload.body ?? payload.content ?? '';
}

/** True when a payload represents a not-yet-translated fallback. */
function isFallback(payload) {
  return Boolean(
    payload.notTranslated ??
      payload.fallback ??
      payload.isFallback ??
      payload.untranslated ??
      (payload.translated === false ? true : undefined),
  );
}

// ---------------------------------------------------------------------------
// Build once for the whole suite
// ---------------------------------------------------------------------------

describe('content build script', () => {
  before(() => {
    assert.ok(
      existsSync(buildScript),
      `Expected build script at ${buildScript}. This spec (BP5) depends on ` +
        'scripts/build-content.mjs (task BP2), which must be implemented first.',
    );
    // Run the real build against the checked-in BP0 fixtures. Fails loudly
    // (non-zero exit) on malformed frontmatter or missing required fields.
    execFileSync(process.execPath, [buildScript], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
  });

  // -------------------------------------------------------------------------
  // Frontmatter parsing
  // -------------------------------------------------------------------------
  describe('frontmatter parsing', () => {
    test('manifest carries parsed frontmatter for the hello-world fixture', () => {
      const manifest = readManifest();
      const hello = entry(manifest, 'hello-world');
      assert.ok(hello, 'hello-world should be present in the manifest');
      assert.equal(
        hello.title,
        'Hello World — Building a Markdown-Powered Writing System',
      );
      assert.match(hello.description, /build-time Markdown pipeline/);
      assert.equal(hello.date, '2026-07-10');
      assert.deepEqual(hello.tags, [
        'angular',
        'markdown',
        'build-tooling',
        'i18n',
      ]);
    });

    test('manifest carries parsed frontmatter for the en-only fixture', () => {
      const manifest = readManifest();
      const enOnly = entry(manifest, 'en-only');
      assert.ok(enOnly, 'en-only should be present in the manifest');
      assert.match(enOnly.title, /English Only/);
      assert.deepEqual(enOnly.tags, ['i18n', 'fallback', 'content-model']);
    });
  });

  // -------------------------------------------------------------------------
  // Reading-time calculation
  // -------------------------------------------------------------------------
  describe('reading-time calculation', () => {
    test('every published manifest entry has a positive integer readingTime', () => {
      const manifest = readManifest();
      assert.ok(manifest.length > 0, 'manifest should not be empty');
      for (const a of manifest) {
        assert.equal(
          typeof a.readingTime,
          'number',
          `${a.slug} readingTime should be a number`,
        );
        assert.ok(
          Number.isInteger(a.readingTime),
          `${a.slug} readingTime should be whole minutes`,
        );
        assert.ok(
          a.readingTime >= 1,
          `${a.slug} readingTime should be at least 1 minute`,
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // TOC extraction + heading anchors
  // -------------------------------------------------------------------------
  describe('table-of-contents extraction', () => {
    test('hello-world payload exposes a TOC built from heading anchors', () => {
      const payload = readPayload('hello-world', 'en');
      const toc = flattenToc(tocOf(payload));
      assert.ok(toc.length > 0, 'TOC should not be empty');

      const ids = toc.map((n) => (n.id ?? n.anchor ?? n.slug ?? '').toLowerCase());
      const texts = toc.map((n) =>
        String(n.text ?? n.title ?? n.label ?? '').toLowerCase(),
      );
      assert.ok(
        ids.includes('introduction') ||
          texts.some((t) => t.includes('introduction')),
        'TOC should contain the "Introduction" heading',
      );
      assert.ok(
        ids.includes('conclusion') ||
          texts.some((t) => t.includes('conclusion')),
        'TOC should contain the "Conclusion" heading',
      );
    });

    test('rendered body carries anchor ids on its headings', () => {
      const payload = readPayload('hello-world', 'en');
      const html = bodyOf(payload);
      assert.ok(html.length > 0, 'rendered body should not be empty');
      assert.match(
        html,
        /id="introduction"/,
        'headings should be anchored by markdown-it-anchor',
      );
    });

    test('code blocks are highlighted at build time (no raw fence left)', () => {
      const payload = readPayload('hello-world', 'en');
      const html = bodyOf(payload);
      // Shiki wraps highlighted code in <pre class="shiki ..."> with inline
      // <span> tokens rather than a bare <pre><code>```-fenced block.
      assert.match(html, /<pre[^>]*>/, 'code should render as a <pre> block');
      assert.doesNotMatch(
        html,
        /```/,
        'no raw markdown code fences should survive into the payload',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Missing-fr graceful fallback
  // -------------------------------------------------------------------------
  describe('missing-translation fallback', () => {
    test('hello-world advertises both langs; en-only advertises en only', () => {
      const manifest = readManifest();
      const hello = entry(manifest, 'hello-world');
      const enOnly = entry(manifest, 'en-only');

      assert.deepEqual([...hello.langs].sort(), ['en', 'fr']);
      assert.deepEqual([...enOnly.langs], ['en']);
      assert.ok(
        !enOnly.langs.includes('fr'),
        'en-only must not claim a French translation',
      );
    });

    test('en-only still emits an fr payload that falls back to English', () => {
      // The French route must render content (not 404); the build reuses the
      // English body flagged "not yet translated".
      assert.ok(
        existsSync(payloadPath('en-only', 'fr')),
        'en-only should still produce an fr payload for the fallback route',
      );
      const frPayload = readPayload('en-only', 'fr');
      const enPayload = readPayload('en-only', 'en');

      const flagged = isFallback(frPayload);
      const reusedBody = bodyOf(frPayload) === bodyOf(enPayload);
      assert.ok(
        flagged || reusedBody,
        'fr fallback should be flagged as untranslated and/or reuse the en body',
      );
    });

    test('a genuinely translated slug does not reuse the fallback flag', () => {
      const frPayload = readPayload('hello-world', 'fr');
      assert.ok(
        !isFallback(frPayload),
        'hello-world fr is a real translation, not a fallback',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Draft exclusion
  // -------------------------------------------------------------------------
  describe('draft exclusion', () => {
    test('draft-sample is absent from the manifest', () => {
      const manifest = readManifest();
      assert.equal(
        entry(manifest, 'draft-sample'),
        undefined,
        'draft articles must never enter the manifest',
      );
    });

    test('published fixtures are present in the manifest', () => {
      const manifest = readManifest();
      assert.ok(entry(manifest, 'hello-world'), 'hello-world should be published');
      assert.ok(entry(manifest, 'en-only'), 'en-only should be published');
    });

    test('draft-sample is absent from the sitemap', () => {
      const sitemap = readPublic('sitemap.xml');
      assert.doesNotMatch(sitemap, /draft-sample/);
    });

    test('draft-sample is absent from the rss feed', () => {
      const rss = readPublic('rss.xml');
      assert.doesNotMatch(rss, /draft-sample/);
    });
  });

  // -------------------------------------------------------------------------
  // Sitemap + RSS content
  // -------------------------------------------------------------------------
  describe('sitemap and rss', () => {
    test('sitemap lists static app routes with hreflang alternates', () => {
      const sitemap = readPublic('sitemap.xml');
      // Home is the bare site URL (no trailing slash), fr alternate at /fr.
      assert.match(sitemap, /<loc>https:\/\/www\.alexabena\.me<\/loc>/, 'home listed');
      assert.match(
        sitemap,
        /hreflang="fr" href="https:\/\/www\.alexabena\.me\/fr"\/>/,
        'home fr alternate listed',
      );
      // The new tools section, including the calculator deep link.
      assert.match(
        sitemap,
        /<loc>https:\/\/www\.alexabena\.me\/tools<\/loc>/,
        'tools index listed',
      );
      assert.match(
        sitemap,
        /<loc>https:\/\/www\.alexabena\.me\/tools\/ai-cost-calculator<\/loc>/,
        'calculator route listed',
      );
      assert.match(
        sitemap,
        /hreflang="fr" href="https:\/\/www\.alexabena\.me\/fr\/tools\/ai-cost-calculator"\/>/,
        'calculator fr alternate listed',
      );
      assert.match(
        sitemap,
        /hreflang="x-default" href="https:\/\/www\.alexabena\.me\/tools"\/>/,
        'x-default alternate points at the en tools URL',
      );
    });

    test('static block precedes article entries and carries no lastmod', () => {
      const sitemap = readPublic('sitemap.xml');
      const firstLoc = sitemap.match(/<loc>([^<]+)<\/loc>/);
      assert.ok(firstLoc, 'sitemap should contain at least one <loc>');
      assert.equal(
        firstLoc[1],
        'https://www.alexabena.me',
        'the home page should be the first sitemap entry',
      );
      // Static <url> blocks have no <lastmod>; only article entries do.
      const toolsBlock = sitemap
        .split('<url>')
        .find((block) => block.includes('/tools/ai-cost-calculator</loc>'));
      assert.ok(toolsBlock, 'calculator <url> block should exist');
      assert.doesNotMatch(
        toolsBlock,
        /<lastmod>/,
        'static entries must not carry a <lastmod>',
      );
    });

    test('sitemap lists published article routes with hreflang alternates', () => {
      const sitemap = readPublic('sitemap.xml');
      assert.match(sitemap, /\/articles\/hello-world/, 'hello-world route listed');
      assert.match(sitemap, /\/articles\/en-only/, 'en-only route listed');
      // Bilingual alternates (en at root, fr under /fr/) via xhtml:link hreflang.
      assert.match(sitemap, /hreflang=/, 'hreflang alternates should be present');
      assert.match(sitemap, /\/fr\//, 'the fr locale alternate should be present');
    });

    test('rss feed includes published articles only', () => {
      const rss = readPublic('rss.xml');
      assert.match(rss, /hello-world/, 'hello-world should appear in the feed');
      assert.match(rss, /en-only/, 'en-only should appear in the feed');
      assert.match(rss, /<item>/, 'rss should contain item entries');
    });
  });
});
