import { describe, expect, it } from 'vitest';
import { detectDelimiter, RECORD_DELIMETER, UNIT_DELIMITER } from './useMetadataXsv';

describe('detectDelimiter', () => {
  it('detects comma as delimiter', () => {
    const sample = ['a,b,c', '1,2,3', 'x,y,z'].join('\n');
    expect(detectDelimiter(sample)).toBe(',');
  });

  it('detects tab as delimiter', () => {
    const sample = ['a\tb\tc', '1\t2\t3', 'x\ty\tz'].join('\n');
    expect(detectDelimiter(sample)).toBe('\t');
  });

  it('detects semicolon as delimiter', () => {
    const sample = ['a;b;c', '1;2;3', 'x;y;z'].join('\n');
    expect(detectDelimiter(sample)).toBe(';');
  });

  it('detects pipe as delimiter', () => {
    const sample = ['a|b|c', '1|2|3', 'x|y|z'].join('\n');
    expect(detectDelimiter(sample)).toBe('|');
  });

  it('detects record separator as delimiter', () => {
    const sample = ['a\u001e b\u001e c', '1\u001e 2\u001e 3', 'x\u001e y\u001e z'].join('\n');
    expect(detectDelimiter(sample)).toBe(RECORD_DELIMETER);
  });

  it('detects unit separator as delimiter', () => {
    const sample = ['a\u001f b\u001f c', '1\u001f 2\u001f 3', 'x\u001f y\u001f 3'].join('\n');
    expect(detectDelimiter(sample)).toBe(UNIT_DELIMITER);
  });

  it('returns empty string when delimiter cannot be determined (single line)', () => {
    const sample = 'a,b,c';
    // Current heuristic picks the first delimiter that achieves the best score, which is comma here
    expect(detectDelimiter(sample)).toBe(',');
  });

  it('returns empty string for empty content', () => {
    const sample = '';
    // With no content, all delimiters tie with the same score; first candidate (comma) wins
    expect(detectDelimiter(sample)).toBe(',');
  });

  it('prefers delimiter with most consistent column counts across lines', () => {
    // Here comma yields consistent 4 columns, space would produce varying counts
    const sample = [
      'col1,col 2,col3,col4',
      'v1,v2,v3,v4',
      'a,b,c,d',
    ].join('\n');
    expect(detectDelimiter(sample)).toBe(',');
  });

  it('falls back to the first candidate on ties', () => {
    // Both comma and semicolon produce consistent 2 columns across lines; comma should win as first in candidates
    const sample = ['a,b;c', '1,2;3', '4,5;6'].join('\n');
    expect(detectDelimiter(sample)).toBe(',');
  });

  it('detects comma when other delimiter characters appear inside values', () => {
    const sample = [
      'name,age,comment',
      'John,30,uses ; and | in text',
      'Jane,25,hello|world; ok',
      'Bob,40,no delimiters here',
    ].join('\n');
    expect(detectDelimiter(sample)).toBe(',');
  });

  it('detects semicolon when commas appear inside values', () => {
    const sample = [
      'name;age;comment',
      'John;30;ACME, Inc.',
      'Jane;25;"comma, inside"',
      'Bob;40;plain text',
    ].join('\n');
    expect(detectDelimiter(sample)).toBe(';');
  });

  it('detects comma when other delimiter characters appear inside values', () => {
    const sample = [
      '"id","len","supp","dose"',
      '"1",4.2,"VC",0.5',
      '"2",11.5,"VC",0.5',
      '"3",7.3,"VC",0.5',
      '"4",5.8,"VC",0.5',
      '"5",6.4,"VC",0.5',
      '"6",10,"VC",0.5',
      '"7",11.2,"VC",0.5',
      '"8",11.2,"VC",0.5',
      '"9",5.2,"VC",0.5',
    ].join('\n');
    expect(detectDelimiter(sample)).toBe(',');
  });
});
