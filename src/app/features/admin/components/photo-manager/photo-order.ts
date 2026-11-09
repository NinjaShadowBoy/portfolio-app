import { Project } from '../../../../core/interfaces/project.interface';

/**
 * Every id of `current` exactly once, ordered as in `wanted`. Ids `wanted`
 * does not list (a photo uploaded since) keep their relative order at the end;
 * ids only `wanted` lists (a photo deleted since) are dropped.
 */
export function reconcileOrder(current: readonly number[], wanted: readonly number[]): number[] {
  const rank = new Map<number, number>();
  wanted.forEach((id, index) => {
    if (!rank.has(id)) rank.set(id, index);
  });
  return current
    .map((id, index) => ({ id, index, rank: rank.get(id) ?? Infinity }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.id);
}

/**
 * Merges a new order of the visible photos into the full list. Hidden photos
 * (deleted, waiting out their Undo window) keep their slots, so Undo puts them
 * back where they were and the result still names every photo the server has.
 */
export function mergeVisibleOrder(
  all: readonly number[],
  visible: readonly number[],
  hidden: ReadonlySet<number>
): number[] {
  const queue = [...visible];
  const merged = all.map((id) => (hidden.has(id) || queue.length === 0 ? id : queue.shift()!));
  return reconcileOrder(all, merged);
}

/** The project with its photos in `ids` order (see `reconcileOrder`), `displayOrder` rewritten and `photoUrls` to match. */
export function withPhotoOrder(project: Project, ids: readonly number[]): Project {
  const photos = project.photos ?? [];
  if (photos.length === 0) return project;
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  const ordered = reconcileOrder(
    photos.map((photo) => photo.id),
    ids
  ).map((id, displayOrder) => ({ ...byId.get(id)!, displayOrder }));
  return { ...project, photos: ordered, photoUrls: ordered.map((photo) => photo.photoUrl) };
}

export function sameOrder(a: readonly number[] | null, b: readonly number[] | null): boolean {
  return !!a && !!b && a.length === b.length && a.every((id, index) => id === b[index]);
}
