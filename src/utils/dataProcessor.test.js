import { scoreSearchResult, normalize } from './dataProcessor';

describe('Search Scoring', () => {
  const mockItem = {
    Entry: 'adadega',
    Syllabary: 'ᎠᏓᏕᎦ',
    hRoot: 'a-dade-g',
    gRoot: 'a-dade-g',
    searchMeta: normalize('adadega ᎠᏓᏕᎦ it’s bouncing a-dade-g adadeg a-dade-g adadeg gadadega ᎦᏓᏕᎦ gạdạdéga')
  };

  test('gives high score to exact root match (sans hyphens) or "null" search', () => {
    const score = scoreSearchResult(mockItem, 'adadeg');
    expect(score).toBeGreaterThanOrEqual(100);
    
    const nullItem = { ...mockItem, hRoot: 'null', searchMeta: 'null ' + mockItem.searchMeta };
    expect(scoreSearchResult(nullItem, 'null')).toBeGreaterThanOrEqual(100);
  });

  test('gives medium score to exact entry match', () => {
    const score = scoreSearchResult(mockItem, 'adadega');
    // It will also match searchMeta, so score might be 51
    expect(score).toBeGreaterThanOrEqual(50);
  });

  test('gives low score to conjugation match', () => {
    const score = scoreSearchResult(mockItem, 'gadadega');
    expect(score).toBe(1);
  });

  test('matches single character if it exists in searchMeta', () => {
    const score = scoreSearchResult(mockItem, 'Ꭰ');
    expect(score).toBeGreaterThan(0);
  });

  test('returns 0 for no match', () => {
    const score = scoreSearchResult(mockItem, 'xyz');
    expect(score).toBe(0);
  });
});
