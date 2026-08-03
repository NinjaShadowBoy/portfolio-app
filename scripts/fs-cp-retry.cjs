// Workaround for intermittent `EPERM: operation not permitted, utime '<dist file>'`
// aborting `ng build` on Windows.
//
// @angular/build copies every asset (public/, src/assets/, src/generated/*) with
//
//   fs.promises.cp(src, dest, { mode: COPYFILE_FICLONE, preserveTimestamps: true })
//
// and `preserveTimestamps` makes Node stamp the file it just wrote via `utime`. On
// Windows a filter driver - Defender real-time scanning, the shell thumbnail/icon
// handlers - can still hold a transient handle on that brand-new file, so the stamp
// is refused with EPERM even though the copy itself completed. It reliably hits
// media-ish assets (favicon.ico, logo.png, a .zip) and never the text ones.
//
// The builder treats any error from that copy loop as fatal and aborts *before*
// flushing the rest of the output, so one unlucky asset leaves dist/ without
// index.html, the JS bundles and server/angular-app-engine-manifest.mjs - which is
// why `pnpm serve` then dies with ERR_MODULE_NOT_FOUND on a build that otherwise
// reported "Application bundle generation complete".
//
// Retrying the whole `cp` does NOT work: re-copying recreates the file and
// re-triggers whatever is holding it, so it fails again every time. Only the stamp
// needs retrying, in place, on the file the copy already wrote.
//
// Preloaded via `node --require` from the build scripts in package.json. It patches
// the `node:fs/promises` module object, which @angular/build resolves per call, so
// it survives builder upgrades (still unfixed as of @angular/build 22.1.2). No-op
// off Windows, so CI is untouched. Set NG_FS_CP_RETRY_DEBUG=1 to log what it did.

'use strict';

if (process.platform === 'win32') {
  const fsp = require('node:fs/promises');

  // Signatures of another process briefly holding the file, not real permission errors.
  const TRANSIENT = new Set(['EPERM', 'EBUSY', 'EACCES']);
  const DELAYS_MS = [20, 40, 80, 160, 320, 640];

  const originalCp = fsp.cp;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const debug = (message) => {
    if (process.env['NG_FS_CP_RETRY_DEBUG']) {
      process.stderr.write(`[fs-cp-retry] ${message}\n`);
    }
  };

  // Finish the timestamp on the file the copy already wrote, without touching its
  // contents again.
  async function stampInPlace(source, destination) {
    for (let attempt = 0; attempt < DELAYS_MS.length; attempt++) {
      await sleep(DELAYS_MS[attempt]);
      try {
        const { atime, mtime } = await fsp.stat(source);
        await fsp.utimes(destination, atime, mtime);
        debug(`stamped ${destination} after ${attempt + 1} attempt(s)`);
        return true;
      } catch {
        // Still held - back off and try again.
      }
    }
    return false;
  }

  async function copyLanded(source, destination) {
    const [from, to] = await Promise.all([
      fsp.stat(source).catch(() => null),
      fsp.stat(destination).catch(() => null),
    ]);
    return from !== null && to !== null && from.size === to.size;
  }

  fsp.cp = async function cpWithRetry(source, destination, options) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await originalCp.call(this, source, destination, options);
      } catch (error) {
        if (!TRANSIENT.has(error.code)) {
          throw error;
        }

        if (error.syscall === 'utime') {
          if (await stampInPlace(source, destination)) {
            return;
          }
          // The bytes are what the build needs; an unpreserved mtime is cosmetic and
          // not worth failing over. Only continue once the copy is provably complete.
          if (await copyLanded(source, destination)) {
            process.stderr.write(
              `[fs-cp-retry] copied ${destination} but could not preserve its timestamp (${error.code})\n`,
            );
            return;
          }
          throw error;
        }

        // The copy itself failed - that one is worth re-running.
        if (attempt >= DELAYS_MS.length) {
          throw error;
        }
        debug(`retrying copy of ${destination} (${error.code} ${error.syscall})`);
        await sleep(DELAYS_MS[attempt]);
      }
    }
  };
}
