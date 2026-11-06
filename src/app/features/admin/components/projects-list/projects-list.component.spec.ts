import { Mocked } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { createSpyObj } from '../../../../../testing/create-spy-obj';
import { ProjectsListComponent, orderByIds } from './projects-list.component';
import { ProjectDataService } from '../../../../core/services/project-data.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Project } from '../../../../core/interfaces/project.interface';

const project = (id: number, extra: Partial<Project> = {}): Project => ({
  id,
  name: `Project ${id}`,
  description: `About ${id}`,
  technologies: ['Angular'],
  githubLink: 'https://github.com/x/y',
  demoLink: null,
  challenges: null,
  whatILearned: null,
  averageRating: 0,
  totalRatings: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
  featured: false,
  displayOrder: id,
  photoUrls: [],
  ...extra,
});

describe('orderByIds', () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it('arranges items by the id list', () => {
    expect(orderByIds(items, [3, 1, 2]).map((i) => i.id)).toEqual([3, 1, 2]);
  });

  it('puts items missing from the list last and drops ids with no item', () => {
    expect(orderByIds(items, [3, 9, 1]).map((i) => i.id)).toEqual([3, 1, 2]);
  });
});

describe('ProjectsListComponent', () => {
  let fixture: ComponentFixture<ProjectsListComponent>;
  let component: ProjectsListComponent;
  let el: HTMLElement;
  let service: Mocked<ProjectDataService>;
  let notification: Mocked<NotificationService>;

  const ids = () =>
    Array.from(el.querySelectorAll('tbody tr[data-row] th[scope="row"]')).map((cell) =>
      Number(cell.textContent?.match(/Project (\d+)/)?.[1]),
    );
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const button = (label: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
  const press = async (target: Element | undefined) => {
    (target as HTMLElement).click();
    await settle();
  };
  const moveDown = (row: number) =>
    press(el.querySelectorAll('tbody tr[data-row]')[row].querySelector('[data-move="down"]')!);

  beforeEach(async () => {
    service = createSpyObj<ProjectDataService>(['reorderProjects']);
    service.reorderProjects.mockReturnValue(of(undefined));
    notification = createSpyObj<NotificationService>(['success', 'error']);
    await TestBed.configureTestingModule({
      imports: [ProjectsListComponent],
      providers: [
        { provide: ProjectDataService, useValue: service },
        { provide: NotificationService, useValue: notification },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectsListComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.componentRef.setInput('projects', [
      project(1, { featured: true, demoLink: 'https://demo.test', averageRating: 4.5, totalRatings: 2 }),
      project(2),
      project(3),
    ]);
    await settle();
  });

  it('shows one row per project with its links, rating and actions', () => {
    expect(ids()).toEqual([1, 2, 3]);
    const first = el.querySelector('tbody tr[data-row]')!;
    expect(first.textContent).toContain('Featured');
    expect(first.textContent).toContain('4.5 (2)');
    expect(Array.from(first.querySelectorAll('.project-links a')).map((a) => a.getAttribute('href'))).toEqual([
      'https://github.com/x/y',
      'https://demo.test',
    ]);
    expect(first.querySelectorAll('.row-actions button').length).toBe(3);
  });

  it('emits edit, photos and delete for the row project', () => {
    const edit = vi.fn();
    const photos = vi.fn();
    const remove = vi.fn();
    component.edit.subscribe(edit);
    component.managePhotos.subscribe(photos);
    component.remove.subscribe(remove);
    const row = el.querySelectorAll('tbody tr[data-row]')[1];
    const rowButton = (label: string) =>
      Array.from(row.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;

    rowButton('Edit').click();
    rowButton('Photos').click();
    rowButton('Delete').click();

    expect(edit).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    expect(photos).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('sorts by name and filters until reorder mode starts', async () => {
    await press(Array.from(el.querySelectorAll('thead button')).find((b) => b.textContent?.includes('Project')));
    await press(Array.from(el.querySelectorAll('thead button')).find((b) => b.textContent?.includes('Project')));
    expect(ids()).toEqual([3, 2, 1]);
    expect(el.querySelector('input[type="search"]')).not.toBeNull();

    await press(button('Reorder projects'));
    expect(ids()).toEqual([1, 2, 3]);
    expect(el.querySelector('thead button')).toBeNull();
    expect(el.querySelector('input[type="search"]')).toBeNull();
  });

  describe('reorder mode', () => {
    beforeEach(async () => {
      await press(button('Reorder projects'));
    });

    it('starts clean: nothing to save or reset', () => {
      expect(component.reordering()).toBe(true);
      expect(component.dirty()).toBe(false);
      expect(button('Save order').disabled).toBe(true);
      expect(button('Reset').disabled).toBe(true);
      expect(el.textContent).not.toContain('Unsaved order changes');
    });

    it('marks the order as changed after a move and clean again when moved back', async () => {
      await moveDown(0);
      expect(ids()).toEqual([2, 1, 3]);
      expect(component.dirty()).toBe(true);
      expect(el.textContent).toContain('Unsaved order changes');
      expect(button('Save order').disabled).toBe(false);

      await press(el.querySelectorAll('tbody tr[data-row]')[1].querySelector('[data-move="up"]')!);
      expect(ids()).toEqual([1, 2, 3]);
      expect(component.dirty()).toBe(false);
    });

    it('restores the stored order on reset and stays in reorder mode', async () => {
      await moveDown(0);
      await press(button('Reset'));

      expect(ids()).toEqual([1, 2, 3]);
      expect(component.reordering()).toBe(true);
      expect(component.dirty()).toBe(false);
    });

    it('leaves reorder mode on cancel without saving', async () => {
      await moveDown(0);
      await press(button('Cancel'));

      expect(component.reordering()).toBe(false);
      expect(ids()).toEqual([1, 2, 3]);
      expect(service.reorderProjects).not.toHaveBeenCalled();
    });

    it('saves every id in the new order, reports success and leaves reorder mode', async () => {
      await moveDown(0);
      await moveDown(1);
      expect(ids()).toEqual([2, 3, 1]);

      await press(button('Save order'));

      expect(service.reorderProjects).toHaveBeenCalledWith([2, 3, 1]);
      expect(notification.success).toHaveBeenCalledWith('Project order saved.');
      expect(component.reordering()).toBe(false);
    });

    it('keeps the draft and reports the failure when saving fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      service.reorderProjects.mockReturnValue(throwError(() => new Error('500')));
      await moveDown(0);

      await press(button('Save order'));

      expect(notification.error).toHaveBeenCalled();
      expect(notification.success).not.toHaveBeenCalled();
      expect(component.reordering()).toBe(true);
      expect(component.dirty()).toBe(true);
      expect(ids()).toEqual([2, 1, 3]);
      expect(component.saving()).toBe(false);
    });

    it('puts a project added meanwhile last without losing the draft order', async () => {
      await moveDown(0);
      fixture.componentRef.setInput('projects', [project(1), project(2), project(3), project(4)]);
      await settle();

      expect(ids()).toEqual([2, 1, 3, 4]);
    });
  });

  it('does not offer reordering for a single project', async () => {
    fixture.componentRef.setInput('projects', [project(1)]);
    await settle();
    expect(button('Reorder projects')).toBeUndefined();
  });

  it('shows the empty message when there are no projects', async () => {
    fixture.componentRef.setInput('projects', []);
    await settle();
    expect(el.querySelector('.dt-state')?.textContent).toContain('No projects found');
  });
});
