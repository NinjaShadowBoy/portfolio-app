import { cloudinarySrcset, cloudinaryUrl } from './cloudinary';

const RAW = 'https://res.cloudinary.com/dct6fuenh/image/upload/v1712345678/portfolio/shot.png';

describe('cloudinaryUrl', () => {
  it('adds format, quality and a width limit after /upload/', () => {
    expect(cloudinaryUrl(RAW, 800)).toBe(
      'https://res.cloudinary.com/dct6fuenh/image/upload/f_auto,q_auto,c_limit,w_800/v1712345678/portfolio/shot.png',
    );
    expect(cloudinaryUrl(RAW)).toContain('/upload/f_auto,q_auto/v1712345678/');
  });

  it('leaves other hosts and already transformed URLs alone', () => {
    expect(cloudinaryUrl('https://example.com/a.png', 800)).toBe('https://example.com/a.png');
    const done = 'https://res.cloudinary.com/x/image/upload/w_300,c_fill/v1/a.png';
    expect(cloudinaryUrl(done, 800)).toBe(done);
  });
});

describe('cloudinarySrcset', () => {
  it('lists every width for Cloudinary and nothing for other hosts', () => {
    expect(cloudinarySrcset(RAW)?.split(', ').map((s) => s.split(' ')[1])).toEqual(['480w', '800w', '1200w', '1600w']);
    expect(cloudinarySrcset('https://example.com/a.png')).toBeNull();
  });
});
