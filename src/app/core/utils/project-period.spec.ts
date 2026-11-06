import { splitPeriod } from './project-period';

describe('splitPeriod', () => {
  it('takes the period line out of the description', () => {
    const result = splitPeriod('Built a thing.\r\n\r\nShipped it.\r\n\r\nPeriod: 2023 – 2024.');
    expect(result).toEqual({ period: '2023 – 2024', body: 'Built a thing.\r\n\r\nShipped it.' });
  });

  it('finds the line in the middle and collapses the gap it leaves', () => {
    const result = splitPeriod('Title.\n\nPeriod: Feb 2024.\n\nDetails.');
    expect(result).toEqual({ period: 'Feb 2024', body: 'Title.\n\nDetails.' });
  });

  it('returns the trimmed description and no period when there is no line', () => {
    expect(splitPeriod('  Just text. ')).toEqual({ period: null, body: 'Just text.' });
    expect(splitPeriod(null)).toEqual({ period: null, body: '' });
  });
});
