import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProjectDataService } from '../../../../core/services/project-data.service';
import { Project } from '../../../../core/interfaces/project.interface';
import { DataTableComponent } from '../../../../shared/ui/data-table/data-table.component';
import { DataTableActionsDirective, DataTableCellDirective } from '../../../../shared/ui/data-table/data-table.directives';
import { DataTableColumn } from '../../../../shared/ui/data-table/data-table.model';
import { TechTagsComponent } from '../../../../shared/ui/tech-tags/tech-tags.component';

/**
 * Items arranged by `ids`. Items missing from `ids` (added since the order was
 * taken) go last; ids with no item (deleted since) are dropped.
 */
export function orderByIds<T extends { id: number }>(items: readonly T[], ids: readonly number[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const listed = new Set(ids);
  const ordered = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  return [...ordered, ...items.filter((item) => !listed.has(item.id))];
}

const PROJECT_COLUMNS: DataTableColumn<Project>[] = [
  { key: 'name', header: $localize`:@@adminColProject:Project`, sortable: true },
  { key: 'technologies', header: $localize`:@@adminColTechnologies:Technologies` },
  { key: 'links', header: $localize`:@@adminColLinks:Links`, searchable: false, width: '6.5rem' },
  {
    key: 'rating',
    header: $localize`:@@adminColRating:Rating`,
    sortable: true,
    align: 'end',
    width: '6rem',
    value: (project) => (project.totalRatings > 0 ? project.averageRating : null),
  },
  { key: 'updatedAt', header: $localize`:@@adminColUpdated:Updated`, sortable: true, width: '8.5rem' },
];

/**
 * The admin projects table. Sorting and filtering are for finding a project;
 * reorder mode edits the order visitors see. It works on a draft list of ids
 * and writes it only when the admin saves.
 */
@Component({
  selector: 'app-projects-list',
  imports: [
    DatePipe,
    DecimalPipe,
    DataTableComponent,
    DataTableCellDirective,
    DataTableActionsDirective,
    TechTagsComponent,
  ],
  templateUrl: './projects-list.component.html',
  styleUrls: ['../../admin-shared.css', './projects-list.component.css'],
})
export class ProjectsListComponent {
  private projectService = inject(ProjectDataService);
  private notification = inject(NotificationService);

  readonly projects = input.required<readonly Project[]>();
  readonly edit = output<Project>();
  readonly managePhotos = output<Project>();
  readonly remove = output<Project>();

  readonly columns = PROJECT_COLUMNS;
  readonly emptyText = $localize`:@@adminNoProjects:No projects found. Create your first project above!`;
  readonly rowKey = (project: Project) => project.id;
  readonly rowLabel = (project: Project) => project.name;
  readonly filterBy = (project: Project) =>
    `${project.name} ${project.description} ${project.technologies.join(' ')}`;

  /** The draft order while reordering, or null when the table is in normal mode. */
  private readonly draftIds = signal<number[] | null>(null);
  readonly saving = signal(false);

  readonly reordering = computed(() => this.draftIds() !== null);
  readonly rows = computed(() => {
    const ids = this.draftIds();
    return ids ? orderByIds(this.projects(), ids) : this.projects();
  });
  /** True when the draft order differs from the stored one. */
  readonly dirty = computed(() => {
    if (!this.reordering()) return false;
    const draft = this.rows().map((project) => project.id);
    return draft.some((id, index) => id !== this.projects()[index]?.id);
  });

  startReorder() {
    this.draftIds.set(this.storedIds());
  }

  onReordered(rows: readonly Project[]) {
    if (this.saving()) return;
    this.draftIds.set(rows.map((project) => project.id));
  }

  resetOrder() {
    this.draftIds.set(this.storedIds());
  }

  cancelReorder() {
    this.draftIds.set(null);
  }

  saveOrder() {
    if (!this.dirty() || this.saving()) return;
    this.saving.set(true);
    this.projectService.reorderProjects(this.rows().map((project) => project.id)).subscribe({
      next: () => {
        this.notification.success($localize`:@@projectsReordered:Project order saved.`);
        this.saving.set(false);
        this.draftIds.set(null);
      },
      error: (err) => {
        console.error('Error saving project order:', err);
        this.notification.error(
          $localize`:@@projectsReorderFailed:Failed to save the project order. Check console for details.`
        );
        this.saving.set(false);
      },
    });
  }

  private storedIds(): number[] {
    return this.projects().map((project) => project.id);
  }
}
