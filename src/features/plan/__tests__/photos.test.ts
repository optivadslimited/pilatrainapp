import { classPhoto, standInPhotos } from '@/config/photos';

import seed from '../data/seedClasses.json';

describe('class photos', () => {
  it('has a stand-in for every class in the catalogue, and none left over', () => {
    const slugs = seed.map((cls) => cls.slug).sort();

    expect(Object.keys(standInPhotos.classes).sort()).toEqual(slugs);
    for (const slug of slugs) {
      expect(classPhoto({ slug, thumbnailUrl: null })).toBeTruthy();
    }
  });

  it('shows the class’s own thumbnail as soon as the catalogue has one', () => {
    const url = 'https://example.com/start-here.jpg';

    expect(classPhoto({ slug: 'start-here', thumbnailUrl: url })).toBe(url);
  });

  it('shows nothing for a class with neither, so the Sand block appears', () => {
    expect(classPhoto({ slug: 'a-class-added-later', thumbnailUrl: null })).toBeNull();
  });

  it('has a Welcome photo', () => {
    expect(standInPhotos.welcome).toBeTruthy();
  });
});
