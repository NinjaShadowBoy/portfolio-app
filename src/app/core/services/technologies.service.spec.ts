import { TestBed } from '@angular/core/testing';

import { TechnologiesService } from './technologies.service';

describe('TechnologiesService', () => {
  let service: TechnologiesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TechnologiesService);
  });

  it('looks up technologies case-insensitively and ignores surrounding whitespace', () => {
    expect(service.getTechnology('  angular ')?.name).toBe('Angular');
    expect(service.getTechnology('TYPESCRIPT')?.docUrl).toContain('typescriptlang.org');
  });

  it('resolves aliases to the same technology', () => {
    expect(service.getTechnology('node')?.name).toBe('Node.js');
    expect(service.getTechnology('node.js')?.logo).toBe(service.getTechnology('nodejs')?.logo);
  });

  it('returns undefined for unknown names', () => {
    expect(service.getTechnology('cobol')).toBeUndefined();
  });

  it('overlays a proficiency without mutating the shared entry', () => {
    const rated = service.getTechnology('Go', 2.5);
    expect(rated?.proficiency).toBe(2.5);
    expect(service.getTechnology('Go')?.proficiency).toBeUndefined();
  });
});
