import { pick4 } from '../responsiveStylePresets';

describe('pick4', () => {
  it('maps desktop to desktopWeb slot', () => {
    expect(pick4('desktop', 1, 2, 3, 4)).toBe(3);
  });

  it('returns correct value per bucket', () => {
    expect(pick4('phone', 'a', 'b', 'c', 'd')).toBe('a');
    expect(pick4('tablet', 'a', 'b', 'c', 'd')).toBe('b');
    expect(pick4('desktopWeb', 'a', 'b', 'c', 'd')).toBe('c');
    expect(pick4('largeDesktop', 'a', 'b', 'c', 'd')).toBe('d');
  });
});
