import { isOpen, type Scheduled } from '@engine';

import { classPhoto, type PhotoSource } from '@/config/photos';
import { formatClassMeta, weekdayName } from '@/lib/format';
import { t } from '@/strings';

import type { ClassDetails, StoredSession } from './types';

/** A session, ready to be shown as a class card. */
export type SessionCard = {
  session: StoredSession;
  /** In playing order. */
  classes: ClassDetails[];
  /** The session is named after its first class. */
  title: string;
  /** "20 min · Beginner · Mat" */
  meta: string;
  /** "Then Posture reset", when a 30-minute session is a 20 followed by a 10. */
  note: string | null;
  minutes: number;
  /** "Thursday" */
  weekday: string;
  /** The first class's photo: a web address or a bundled image. */
  imageUrl: PhotoSource | null;
  photoLabel: string;
  isOpen: boolean;
  isDone: boolean;
};

export type Catalogue = ReadonlyMap<string, ClassDetails>;

export const indexCatalogue = (classes: readonly ClassDetails[]): Catalogue =>
  new Map(classes.map((cls) => [cls.id, cls]));

/**
 * `null` if the session's class is not in the catalogue, which can only
 * happen if a class was unpublished after her plan was built.
 */
export function sessionCard(session: StoredSession, catalogue: Catalogue): SessionCard | null {
  const classes = session.classIds
    .map((id) => catalogue.get(id))
    .filter((cls): cls is ClassDetails => cls !== undefined);
  const [first, ...rest] = classes;
  if (!first) return null;

  const minutes = classes.reduce((sum, cls) => sum + cls.lengthMin, 0);

  return {
    session,
    classes,
    title: first.title,
    meta: formatClassMeta({
      minutes,
      level: Math.max(...classes.map((cls) => cls.level)),
      equipment: [...new Set(classes.flatMap((cls) => cls.equipment))],
    }),
    note: rest.length > 0 ? t.classMeta.then(rest.map((cls) => cls.title).join(', ')) : null,
    minutes,
    weekday: weekdayName(session.date),
    imageUrl: classPhoto(first),
    photoLabel: t.classMeta.photoLabel(first.title),
    isOpen: isOpen(session),
    isDone: session.status === 'done',
  };
}

/** Her sessions with their intensity attached, as the engine's move rules need them. */
export function scheduled(
  sessions: readonly StoredSession[],
  catalogue: Catalogue,
): (StoredSession & Scheduled)[] {
  return sessions.map((session) => ({
    ...session,
    intensity: Math.max(1, ...session.classIds.map((id) => catalogue.get(id)?.intensity ?? 1)),
  }));
}
