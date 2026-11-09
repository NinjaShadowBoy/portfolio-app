import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IdentityService } from './core/services/identity.service';
import { ProjectDataService } from './core/services/project-data.service';
import { signal } from '@angular/core';

describe('AppComponent', () => {
  beforeEach(async () => {
    // The deferred mascot asks GET /chat/config; keep it off the network.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ enabled: false, remainingToday: null }), { status: 200 }),
      ),
    );
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: IdentityService, useValue: { identity: signal(null) } },
        { provide: ProjectDataService, useValue: { projects: () => [], getProject: () => undefined } },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should render the application shell', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).not.toBeNull();
    expect(compiled.querySelector('main router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-notification-container')).not.toBeNull();
  });
});
