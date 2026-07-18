import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { CommentService, CommentCreatePayload, CommentDto } from './comment.service';
import { environment } from '../../../environments/environment';

describe('CommentService', () => {
  let service: CommentService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CommentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('createComment posts the correct polymorphic project body', () => {
    const payload: CommentCreatePayload = {
      projectId: 7,
      type: 'critique',
      body: 'Nice work',
    };

    service.createComment(payload).subscribe();

    const req = httpMock.expectOne(`${base}/comments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.body.projectId).toBe(7);
    expect(req.request.body.articleSlug).toBeUndefined();
    expect(req.request.body.type).toBe('critique');
    req.flush({});
  });

  it('createComment posts the correct polymorphic article body', () => {
    const payload: CommentCreatePayload = {
      articleSlug: 'hello-world',
      type: 'feature_request',
      body: 'Please add X',
    };

    service.createComment(payload).subscribe();

    const req = httpMock.expectOne(`${base}/comments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.body.articleSlug).toBe('hello-world');
    expect(req.request.body.projectId).toBeUndefined();
    expect(req.request.body.type).toBe('feature_request');
    req.flush({});
  });

  it('getArticleComments hits /articles/:slug/comments', () => {
    service.getArticleComments('hello-world').subscribe();

    const req = httpMock.expectOne(`${base}/articles/hello-world/comments`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getArticleComments encodes the slug', () => {
    service.getArticleComments('a b/c').subscribe();

    const req = httpMock.expectOne(`${base}/articles/a%20b%2Fc/comments`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getProjectComments hits /projects/:id/comments', () => {
    service.getProjectComments(42).subscribe();

    const req = httpMock.expectOne(`${base}/projects/42/comments`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('updateComment PUTs a body-only payload', () => {
    service.updateComment(3, 'edited').subscribe();

    const req = httpMock.expectOne(`${base}/comments/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ body: 'edited' });
    req.flush({});
  });

  it('deleteComment DELETEs the comment', () => {
    service.deleteComment(9).subscribe();

    const req = httpMock.expectOne(`${base}/comments/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getMyComments hits /users/me/comments and carries polymorphic fields', () => {
    let received: CommentDto[] | undefined;
    service.getMyComments().subscribe((c) => (received = c));

    const req = httpMock.expectOne(`${base}/users/me/comments`);
    expect(req.request.method).toBe('GET');
    const rows: CommentDto[] = [
      {
        id: 1,
        userId: 2,
        userName: 'Ann',
        userImage: null,
        projectId: null,
        articleSlug: 'hello-world',
        type: 'suggestion',
        body: 'hi',
        createdAt: '2026-07-17T00:00:00Z',
        updatedAt: '2026-07-17T00:00:00Z',
      },
    ];
    req.flush(rows);
    expect(received?.[0].articleSlug).toBe('hello-world');
    expect(received?.[0].projectId).toBeNull();
    expect(received?.[0].type).toBe('suggestion');
  });
});
