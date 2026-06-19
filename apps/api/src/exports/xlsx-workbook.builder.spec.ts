import { XlsxWorkbookBuilder } from './xlsx-workbook.builder';

describe('XlsxWorkbookBuilder', () => {
  it('builds a valid xlsx zip buffer with workbook entries', () => {
    const builder = new XlsxWorkbookBuilder();
    const workbook = builder.build([
      {
        name: 'Ozet',
        rows: [
          ['Metrik', 'Deger'],
          ['Net kar', '1200.00']
        ]
      }
    ]);
    const content = workbook.toString('utf8');

    expect(workbook.subarray(0, 4).toString('hex')).toBe('504b0304');
    expect(content).toContain('[Content_Types].xml');
    expect(content).toContain('xl/workbook.xml');
    expect(content).toContain('xl/worksheets/sheet1.xml');
  });
});
