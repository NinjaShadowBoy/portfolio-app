import { Directive, TemplateRef, inject, input } from '@angular/core';

export interface DataTableCellContext {
  /** The row. Also available as `row`. */
  $implicit: any;
  row: any;
  /** Position of the row in the rendered list. */
  index: number;
}

/**
 * Custom cell content for the column with the given key:
 * `<ng-template appDataTableCell="name" let-user>{{ user.name }}</ng-template>`
 */
@Directive({ selector: 'ng-template[appDataTableCell]' })
export class DataTableCellDirective {
  readonly columnKey = input.required<string>({ alias: 'appDataTableCell' });
  readonly template = inject<TemplateRef<DataTableCellContext>>(TemplateRef);

  static ngTemplateContextGuard(_directive: DataTableCellDirective, _context: unknown): _context is DataTableCellContext {
    return true;
  }
}

/** Content of the trailing actions column: `<ng-template appDataTableActions let-row>...</ng-template>` */
@Directive({ selector: 'ng-template[appDataTableActions]' })
export class DataTableActionsDirective {
  readonly template = inject<TemplateRef<DataTableCellContext>>(TemplateRef);

  static ngTemplateContextGuard(_directive: DataTableActionsDirective, _context: unknown): _context is DataTableCellContext {
    return true;
  }
}
