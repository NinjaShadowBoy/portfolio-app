import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DeviceCodeResponse, isDevicePending } from '../../../core/interfaces/auth.interface';

type Phase = 'starting' | 'waiting' | 'done' | 'error';

@Component({
  selector: 'app-github-device',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="device-container">
      <div class="device-card">
        <h1 class="device-title" i18n="@@deviceTitle">Sign in with GitHub</h1>

        @if (phase() === 'starting') {
          <div class="spinner"></div>
          <p class="device-text" i18n="@@deviceStarting">Requesting a device code…</p>
        }

        @if (phase() === 'waiting') {
          <p class="device-text" i18n="@@deviceStep1">1. Open the verification page:</p>
          <a class="device-link" [href]="verificationUri()" target="_blank" rel="noopener">
            {{ verificationUri() }}
          </a>

          <p class="device-text" i18n="@@deviceStep2">2. Enter this code:</p>
          <div class="device-code" (click)="copyCode()" title="Click to copy" i18n-title="@@deviceCopyTitle">
            {{ userCode() }}
          </div>

          <div class="device-actions">
            <a class="btn btn-primary" [href]="verificationUri()" target="_blank" rel="noopener" i18n="@@deviceOpen">
              Open GitHub
            </a>
            <button type="button" class="btn btn-ghost" (click)="copyCode()" i18n="@@deviceCopy">Copy code</button>
          </div>

          <p class="device-hint">
            <span class="spinner spinner-sm"></span>
            <span i18n="@@deviceWaiting">Waiting for you to authorize…</span>
          </p>
        }

        @if (phase() === 'done') {
          <div class="spinner"></div>
          <p class="device-text" i18n="@@deviceDone">Authorized! Redirecting…</p>
        }

        @if (phase() === 'error') {
          <p class="device-error">{{ message() }}</p>
          <button type="button" class="btn btn-primary" (click)="start()" i18n="@@deviceRetry">Try again</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .device-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 1rem; }
    .device-card { max-width: 460px; width: 100%; text-align: center; padding: 2rem; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-raised, var(--surface-base)); }
    .device-title { font-size: 1.4rem; margin-bottom: 1.25rem; }
    .device-text { color: var(--text-secondary); margin: 0.75rem 0 0.35rem; }
    .device-link { display: inline-block; word-break: break-all; color: var(--color-primary-500); }
    .device-code { font-family: ui-monospace, monospace; font-size: 2rem; letter-spacing: 0.35rem; font-weight: 700; margin: 0.5rem auto 1rem; padding: 0.75rem 1rem; border: 1px dashed var(--border-subtle); border-radius: 12px; cursor: pointer; user-select: all; }
    .device-actions { display: flex; gap: 0.75rem; justify-content: center; margin: 1rem 0; }
    .btn { padding: 0.6rem 1.1rem; border-radius: 10px; font-weight: 600; text-decoration: none; cursor: pointer; border: 1px solid transparent; }
    .btn-primary { background: var(--color-primary-500); color: #fff; }
    .btn-ghost { background: transparent; border-color: var(--border-subtle); color: var(--text-primary); }
    .device-hint { display: flex; gap: 0.5rem; align-items: center; justify-content: center; color: var(--text-secondary); margin-top: 1rem; }
    .device-error { color: var(--color-danger-500, #e5484d); margin-bottom: 1rem; }
    .spinner { width: 42px; height: 42px; margin: 0 auto 1rem; border: 4px solid var(--border-subtle); border-top-color: var(--color-primary-500); border-radius: 50%; animation: spin 0.8s linear infinite; }
    .spinner-sm { width: 18px; height: 18px; margin: 0; border-width: 3px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class GithubDeviceComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notifier = inject(NotificationService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  phase = signal<Phase>('starting');
  userCode = signal('');
  verificationUri = signal('');
  message = signal('');

  private deviceCode = '';
  private intervalMs = 5000;
  private deadline = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    if (this.isBrowser) this.start();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  start(): void {
    this.clearTimer();
    this.phase.set('starting');
    this.auth.startGitHubDevice().subscribe({
      next: (res: DeviceCodeResponse) => {
        this.deviceCode = res.deviceCode;
        this.userCode.set(res.userCode);
        this.verificationUri.set(res.verificationUri);
        this.intervalMs = Math.max(res.interval, 1) * 1000;
        this.deadline = Date.now() + Math.max(res.expiresIn, 1) * 1000;
        this.phase.set('waiting');
        this.schedulePoll();
      },
      error: (err) => this.fail(err?.error?.message || $localize`:@@deviceStartFailed:Could not start GitHub sign-in. Is device flow enabled?`),
    });
  }

  private schedulePoll(): void {
    this.clearTimer();
    this.timer = setTimeout(() => this.poll(), this.intervalMs);
  }

  private poll(): void {
    if (Date.now() >= this.deadline) {
      this.fail($localize`:@@deviceExpired:The code expired. Please try again.`);
      return;
    }
    this.auth.pollGitHubDevice(this.deviceCode).subscribe({
      next: (result) => {
        if (isDevicePending(result)) {
          // GitHub asks us to back off when it returns slow_down.
          if (result.status === 'slow_down') this.intervalMs += 5000;
          this.schedulePoll();
          return;
        }
        this.auth.setSession(result);
        this.phase.set('done');
        this.notifier.success($localize`:@@deviceSuccess:Signed in with GitHub!`);
        this.timer = setTimeout(() => this.router.navigateByUrl('/home'), 800);
      },
      error: (err) => this.fail(err?.error?.message || $localize`:@@deviceFailed:GitHub sign-in failed. Please try again.`),
    });
  }

  copyCode(): void {
    if (!this.isBrowser || !navigator?.clipboard) return;
    navigator.clipboard.writeText(this.userCode()).then(
      () => this.notifier.success($localize`:@@deviceCopied:Code copied`),
      () => {},
    );
  }

  private fail(message: string): void {
    this.clearTimer();
    this.message.set(message);
    this.phase.set('error');
    this.notifier.error(message);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
