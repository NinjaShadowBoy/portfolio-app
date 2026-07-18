import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { FeedbackComponent } from './feedback.component';
import { CommentDto } from '../../../core/services/comment.service';
import { Identity, IdentityService } from '../../../core/services/identity.service';
import { NotificationService } from '../../../core/services/notification.service';
import { environment } from '../../../../environments/environment';

/**
 * Minimal IdentityService stub: exposes a writable identity signal (so tests can
 * flip between anon/authed) and a refresh spy (so we can assert the first-submit
 * anon-provisioning call without hitting /auth/me).
 */
function makeIdentityStub(initial: Identity | null = null) {
  const identitySignal = signal<Identity | null>(initial);
  return {
    identitySignal,
    stub: {
      identity: identitySignal.asReadonly(),
      refresh: jasmine.createSpy('refresh'),
    },
  };
}

function makeComment(overrides: Partial<CommentDto>): CommentDto {
  return {
    id: 1,
    userId: 1,
    userName: 'Ann',
    userImage: null,
    projectId: 1,
    articleSlug: null,
    type: 'critique',
    body: 'A comment',
    createdAt: '2026-07-17T00:00:00Z',
    updatedAt: '2026-07-17T00:00:00Z',
    ...overrides,
  };
}

describe('FeedbackComponent', () => {
  let fixture: ComponentFixture<FeedbackComponent>;
  let component: FeedbackComponent;
  let httpMock: HttpTestingController;
  let identity: ReturnType<typeof makeIdentityStub>;
  let notification: NotificationService;
  const base = environment.apiBaseUrl;

  function configure(initialIdentity: Identity | null = null) {
    identity = makeIdentityStub(initialIdentity);
    TestBed.configureTestingModule({
      imports: [FeedbackComponent, HttpClientTestingModule],
      providers: [{ provide: IdentityService, useValue: identity.stub }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    notification = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(FeedbackComponent);
    component = fixture.componentInstance;
  }

  /** Set the target inputs and run the first change detection (fires effects). */
  function mount(inputs: { projectId?: number | null; articleSlug?: string | null }) {
    if ('projectId' in inputs) fixture.componentRef.setInput('projectId', inputs.projectId);
    if ('articleSlug' in inputs) fixture.componentRef.setInput('articleSlug', inputs.articleSlug);
    fixture.detectChanges();
  }

  /** Flush the load-thread GET the load effect issues for the given target. */
  function flushProjectLoad(id: number, rows: CommentDto[] = []) {
    const req = httpMock.expectOne(`${base}/projects/${id}/comments`);
    expect(req.request.method).toBe('GET');
    req.flush(rows);
    fixture.detectChanges();
  }

  function flushArticleLoad(slug: string, rows: CommentDto[] = []) {
    const req = httpMock.expectOne(`${base}/articles/${encodeURIComponent(slug)}/comments`);
    expect(req.request.method).toBe('GET');
    req.flush(rows);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    configure();
    mount({ projectId: 1 });
    flushProjectLoad(1);
    expect(component).toBeTruthy();
  });

  describe('dev-time exactly-one-target guard', () => {
    it('logs an error when neither projectId nor articleSlug is set', () => {
      configure();
      const errorSpy = spyOn(console, 'error');
      // Both inputs default to null -> no target, no HTTP load.
      fixture.detectChanges();

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy.calls.mostRecent().args[0]).toContain('exactly one');
    });

    it('logs an error when BOTH projectId and articleSlug are set', () => {
      configure();
      const errorSpy = spyOn(console, 'error');
      mount({ projectId: 5, articleSlug: 'hello-world' });
      // projectId wins the derived target, so the load effect hits the project URL.
      flushProjectLoad(5);

      const guardCall = errorSpy.calls
        .allArgs()
        .find((args) => typeof args[0] === 'string' && args[0].includes('exactly one'));
      expect(guardCall).toBeTruthy();
    });

    it('does NOT log the guard error when exactly one target is set', () => {
      configure();
      const errorSpy = spyOn(console, 'error');
      mount({ articleSlug: 'hello-world' });
      flushArticleLoad('hello-world');

      const guardCall = errorSpy.calls
        .allArgs()
        .find((args) => typeof args[0] === 'string' && args[0].includes('exactly one'));
      expect(guardCall).toBeFalsy();
    });
  });

  describe('type selection + submit', () => {
    it('posts the correct polymorphic project payload with the selected type', () => {
      configure();
      mount({ projectId: 7 });
      flushProjectLoad(7);

      component.selectType('suggestion');
      component.newCommentText.set('  Please tweak this  ');
      component.addComment();

      const post = httpMock.expectOne(`${base}/comments`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({
        projectId: 7,
        type: 'suggestion',
        body: 'Please tweak this',
      });
      expect(post.request.body.articleSlug).toBeUndefined();
      post.flush(makeComment({ id: 99, projectId: 7, type: 'suggestion' }));

      // Success reloads the thread.
      flushProjectLoad(7);
    });

    it('posts an article-targeted payload when mounted with articleSlug', () => {
      configure();
      mount({ articleSlug: 'hello-world' });
      flushArticleLoad('hello-world');

      component.selectType('feature_request');
      component.newCommentText.set('Add dark mode');
      component.addComment();

      const post = httpMock.expectOne(`${base}/comments`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({
        articleSlug: 'hello-world',
        type: 'feature_request',
        body: 'Add dark mode',
      });
      expect(post.request.body.projectId).toBeUndefined();
      post.flush(makeComment({ id: 5, projectId: null, articleSlug: 'hello-world' }));

      flushArticleLoad('hello-world');
    });

    it('clears the textarea after a successful submit', () => {
      configure();
      mount({ projectId: 1 });
      flushProjectLoad(1);

      component.newCommentText.set('Nice');
      component.addComment();
      httpMock.expectOne(`${base}/comments`).flush(makeComment({ id: 2 }));
      flushProjectLoad(1);

      expect(component.newCommentText()).toBe('');
    });

    it('does not submit when the body is blank', () => {
      configure();
      mount({ projectId: 1 });
      flushProjectLoad(1);

      component.newCommentText.set('   ');
      component.addComment();

      httpMock.expectNone(`${base}/comments`);
    });
  });

  describe('anonymous submit path', () => {
    it('calls identityService.refresh() after the first submit to pick up the anon identity', () => {
      configure(null); // start anonymous / unresolved
      mount({ projectId: 3 });
      flushProjectLoad(3);

      component.newCommentText.set('First!');
      component.addComment();
      httpMock.expectOne(`${base}/comments`).flush(makeComment({ id: 10 }));
      flushProjectLoad(3);

      expect(identity.stub.refresh).toHaveBeenCalled();
    });

    it('surfaces an error notification when the submit fails', () => {
      configure();
      const errorSpy = spyOn(notification, 'error');
      spyOn(console, 'error');
      mount({ projectId: 1 });
      flushProjectLoad(1);

      component.newCommentText.set('Boom');
      component.addComment();
      httpMock
        .expectOne(`${base}/comments`)
        .flush('nope', { status: 500, statusText: 'Server Error' });

      expect(errorSpy).toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    });
  });

  describe('per-type grouped rendering', () => {
    it('groups existing feedback by type and drops empty groups', () => {
      configure();
      mount({ projectId: 1 });
      flushProjectLoad(1, [
        makeComment({ id: 1, type: 'critique', body: 'c1' }),
        makeComment({ id: 2, type: 'critique', body: 'c2' }),
        makeComment({ id: 3, type: 'suggestion', body: 's1' }),
      ]);

      const groups = component.groupedComments();
      // feature_request has no rows -> dropped.
      expect(groups.length).toBe(2);
      const critique = groups.find((g) => g.value === 'critique');
      const suggestion = groups.find((g) => g.value === 'suggestion');
      expect(critique?.comments.length).toBe(2);
      expect(critique?.tone).toBe('danger');
      expect(suggestion?.comments.length).toBe(1);
      expect(suggestion?.tone).toBe('info');
      expect(groups.some((g) => g.value === 'feature_request')).toBe(false);

      const badges = fixture.nativeElement.querySelectorAll('.feedback-group');
      expect(badges.length).toBe(2);
    });

    it('renders the empty state when there is no feedback', () => {
      configure();
      mount({ projectId: 1 });
      flushProjectLoad(1, []);

      expect(fixture.nativeElement.querySelector('.feedback-empty')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.feedback-groups')).toBeFalsy();
    });
  });

  describe('own-item edit/delete gating', () => {
    const me: Identity = {
      id: 2,
      name: 'Me',
      role: 'user',
      provider: 'anonymous',
      imageUrl: null,
      anonymous: true,
    };

    it('isMyComment is true only for comments authored by the current identity', () => {
      configure(me);
      mount({ projectId: 1 });
      flushProjectLoad(1, [
        makeComment({ id: 1, userId: 2, userName: 'Me' }),
        makeComment({ id: 2, userId: 9, userName: 'Someone else' }),
      ]);

      expect(component.isMyComment(makeComment({ id: 1, userId: 2 }))).toBe(true);
      expect(component.isMyComment(makeComment({ id: 2, userId: 9 }))).toBe(false);
    });

    it('renders edit/delete controls only on the current user\'s comments', () => {
      configure(me);
      mount({ projectId: 1 });
      flushProjectLoad(1, [
        makeComment({ id: 1, userId: 2, userName: 'Me', type: 'critique' }),
        makeComment({ id: 2, userId: 9, userName: 'Other', type: 'critique' }),
      ]);

      const editButtons = fixture.nativeElement.querySelectorAll('.edit-btn');
      const deleteButtons = fixture.nativeElement.querySelectorAll('.delete-btn');
      expect(editButtons.length).toBe(1);
      expect(deleteButtons.length).toBe(1);
    });

    it('hides all edit/delete controls when the viewer is not the author', () => {
      configure(null); // no identity resolved
      mount({ projectId: 1 });
      flushProjectLoad(1, [makeComment({ id: 1, userId: 2, userName: 'Me' })]);

      expect(fixture.nativeElement.querySelectorAll('.edit-btn').length).toBe(0);
      expect(fixture.nativeElement.querySelectorAll('.delete-btn').length).toBe(0);
    });

    it('deleteComment DELETEs after confirmation and reloads the thread', () => {
      configure(me);
      spyOn(window, 'confirm').and.returnValue(true);
      mount({ projectId: 1 });
      flushProjectLoad(1, [makeComment({ id: 1, userId: 2 })]);

      component.deleteComment(makeComment({ id: 1, userId: 2 }));
      const del = httpMock.expectOne(`${base}/comments/1`);
      expect(del.request.method).toBe('DELETE');
      del.flush(null);

      flushProjectLoad(1);
    });

    it('does not DELETE when the confirmation is dismissed', () => {
      configure(me);
      spyOn(window, 'confirm').and.returnValue(false);
      mount({ projectId: 1 });
      flushProjectLoad(1, [makeComment({ id: 1, userId: 2 })]);

      component.deleteComment(makeComment({ id: 1, userId: 2 }));
      httpMock.expectNone(`${base}/comments/1`);
    });
  });

  describe('editing an own comment', () => {
    it('PUTs the trimmed body and reloads on save', () => {
      configure();
      mount({ projectId: 1 });
      flushProjectLoad(1, [makeComment({ id: 4, body: 'old' })]);

      component.startEdit(makeComment({ id: 4, body: 'old' }));
      expect(component.editingCommentId()).toBe(4);

      component.editCommentText.set('  new body  ');
      component.saveEdit(makeComment({ id: 4, body: 'old' }));

      const put = httpMock.expectOne(`${base}/comments/4`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({ body: 'new body' });
      put.flush(makeComment({ id: 4, body: 'new body' }));

      flushProjectLoad(1);
      expect(component.editingCommentId()).toBeNull();
    });
  });
});
