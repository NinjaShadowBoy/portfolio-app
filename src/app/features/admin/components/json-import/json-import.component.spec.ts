import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../../../../core/services/notification.service';
import { JsonImportComponent } from './json-import.component';

describe('JsonImportComponent', () => {
  let component: JsonImportComponent;
  const project = {
    name: 'Example project',
    description: 'An example project description',
    technologies: ['TypeScript'],
    githubLink: 'https://github.com/example/project',
    challenges: 'Example challenges',
    whatILearned: 'Example learnings',
    featured: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: NotificationService, useValue: { error: jasmine.createSpy('error') } }],
    });
    component = TestBed.runInInjectionContext(() => new JsonImportComponent());
  });

  it('imports valid create and update records together', () => {
    const records = [project, { ...project, id: 42 }];
    const emit = spyOn(component.importSuccess, 'emit');
    component.importData.set(JSON.stringify(records));
    component.processJson();
    expect(emit).toHaveBeenCalledOnceWith(records);
    expect(component.jsonError()).toBe('');
    expect(component.importData()).toBe('');
  });

  it('rejects invalid field types and IDs before emitting a request', () => {
    const emit = spyOn(component.importSuccess, 'emit');
    for (const invalid of [
      null,
      { ...project, name: 123 },
      { ...project, description: '   ' },
      { ...project, technologies: 'TypeScript' },
      { ...project, technologies: [123] },
      { ...project, featured: 'false' },
      { ...project, id: -1 },
      { ...project, id: 1.5 },
    ]) {
      component.importData.set(JSON.stringify(invalid));
      component.processJson();
      expect(component.jsonError()).not.toBe('');
    }
    expect(emit).not.toHaveBeenCalled();
  });

  it('rejects empty batches and batches containing invalid projects', () => {
    const emit = spyOn(component.importSuccess, 'emit');
    for (const batch of [[], [project, { name: 'Incomplete' }]]) {
      component.importData.set(JSON.stringify(batch));
      component.processJson();
      expect(component.jsonError()).not.toBe('');
    }
    expect(emit).not.toHaveBeenCalled();
  });
});
