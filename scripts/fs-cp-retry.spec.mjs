// Tests for scripts/fs-cp-retry.cjs.
//
// The subtle part is that a refused `utime` must be retried *in place*: re-running
// the copy recreates the file and re-triggers whatever is holding it, so the build
// never recovers. These tests pin that behaviour by stubbing the underlying cp and
// counting how many times it runs.
//
// Run: node --test scripts/fs-cp-retry.spec.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// The shim only patches on Windows, which is the only platform that hits the bug.
const skip = process.platform !== 'win32' ? 'Windows-only shim' : false;

let copyBehaviour = async () => {};
let copyCalls = 0;

// Stub fs.promises.cp *before* the shim captures it, so the wrapper wraps the stub.
fsp.cp = async (source, destination, options) => {
  copyCalls++;
  return copyBehaviour(source, destination, options);
};

createRequire(import.meta.url)('./fs-cp-retry.cjs');
const cp = fsp.cp;

function transientError(code, syscall) {
  const error = new Error(`${code}: operation not permitted, ${syscall}`);
  error.code = code;
  error.syscall = syscall;
  return error;
}

async function fixture() {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'fs-cp-retry-'));
  const source = path.join(dir, 'source.bin');
  const destination = path.join(dir, 'destination.bin');
  await fsp.writeFile(source, 'contents');
  await fsp.writeFile(destination, 'contents');
  // Give the source a distinct mtime so we can tell whether it was propagated.
  const stamp = new Date(Date.now() - 60_000);
  await fsp.utimes(source, stamp, stamp);
  return { dir, source, destination };
}

test('a refused utime is re-stamped in place, without copying again', { skip }, async () => {
  const { source, destination } = await fixture();
  copyCalls = 0;
  copyBehaviour = async () => {
    throw transientError('EPERM', 'utime');
  };

  await cp(source, destination, { preserveTimestamps: true });

  assert.equal(copyCalls, 1, 'must not re-copy: that re-triggers the file holder');
  const [from, to] = await Promise.all([fsp.stat(source), fsp.stat(destination)]);
  assert.ok(
    Math.abs(from.mtime.getTime() - to.mtime.getTime()) < 10,
    'timestamp should have been preserved by the in-place retry',
  );
});

test('a failed copy is retried', { skip }, async () => {
  const { source, destination } = await fixture();
  copyCalls = 0;
  copyBehaviour = async () => {
    if (copyCalls === 1) throw transientError('EBUSY', 'copyfile');
  };

  await cp(source, destination, { preserveTimestamps: true });

  assert.equal(copyCalls, 2, 'a transient copy failure should be re-run');
});

test('a real error is not retried or swallowed', { skip }, async () => {
  const { source, destination } = await fixture();
  copyCalls = 0;
  copyBehaviour = async () => {
    throw transientError('ENOENT', 'copyfile');
  };

  await assert.rejects(() => cp(source, destination, {}), { code: 'ENOENT' });
  assert.equal(copyCalls, 1);
});

test('an unstampable file still fails when the copy did not land', { skip }, async () => {
  const { dir, source } = await fixture();
  const missing = path.join(dir, 'never-written.bin');
  copyCalls = 0;
  copyBehaviour = async () => {
    throw transientError('EPERM', 'utime');
  };

  await assert.rejects(() => cp(source, missing, { preserveTimestamps: true }), { code: 'EPERM' });
});
