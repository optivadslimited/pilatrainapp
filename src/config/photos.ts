/** A photo to show: a web address, or an image bundled with the app (`require`). */
export type PhotoSource = string | number;

/**
 * Stand-in photos, shown until the real photography exists.
 *
 * TODO(owner): replace every one with real photography of the instructor
 * before release, then delete this list and `assets/images/stand-ins`.
 *
 * These are generated images, made with Higgsfield on 19 November 2026 at the
 * owner's request. The woman in them is not a real person and is not the
 * instructor, so nothing in the app may say that she is. They are here so a
 * test build shows pictures instead of blank blocks.
 */
export const standInPhotos = {
  /** The Welcome hero, 3:4. */
  welcome: require('../../assets/images/stand-ins/welcome.jpg') as number,
  /** One per class, 3:4, by the class's slug. Cards crop it to 4:5. */
  classes: {
    'start-here': require('../../assets/images/stand-ins/start-here.jpg'),
    'posture-reset': require('../../assets/images/stand-ins/posture-reset.jpg'),
    'evening-unwind': require('../../assets/images/stand-ins/evening-unwind.jpg'),
    'ten-minute-core': require('../../assets/images/stand-ins/ten-minute-core.jpg'),
    'morning-wake-up': require('../../assets/images/stand-ins/morning-wake-up.jpg'),
    'quick-energiser': require('../../assets/images/stand-ins/quick-energiser.jpg'),
    'breath-and-alignment': require('../../assets/images/stand-ins/breath-and-alignment.jpg'),
    'core-and-posture': require('../../assets/images/stand-ins/core-and-posture.jpg'),
    'hips-and-spine': require('../../assets/images/stand-ins/hips-and-spine.jpg'),
    'full-body-flow': require('../../assets/images/stand-ins/full-body-flow.jpg'),
    'core-with-the-band': require('../../assets/images/stand-ins/core-with-the-band.jpg'),
    'balance-with-the-small-ball': require('../../assets/images/stand-ins/balance-with-the-small-ball.jpg'),
    'foundations-in-full': require('../../assets/images/stand-ins/foundations-in-full.jpg'),
    'slow-stretch-and-release': require('../../assets/images/stand-ins/slow-stretch-and-release.jpg'),
    'full-body-strength': require('../../assets/images/stand-ins/full-body-strength.jpg'),
    'core-strength-with-light-weights': require('../../assets/images/stand-ins/core-strength-with-light-weights.jpg'),
  } as Record<string, number | undefined>,
};

/**
 * The photo for a class: its own thumbnail once the catalogue has one,
 * otherwise its stand-in, otherwise nothing (a labelled Sand block is shown).
 */
export function classPhoto(cls: { slug: string; thumbnailUrl: string | null }): PhotoSource | null {
  return cls.thumbnailUrl ?? standInPhotos.classes[cls.slug] ?? null;
}
