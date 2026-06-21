import { PdfReportBuilder } from './pdf-report.builder';

describe('PdfReportBuilder', () => {
  it('builds a valid pdf buffer with report text', () => {
    const builder = new PdfReportBuilder();
    const pdf = builder.build({
      title: 'TAG Sürücü Finans Raporu',
      subtitle: '2026-06-01 - 2026-06-30',
      sections: [
        {
          title: 'Finans Özeti',
          rows: [
            ['Brüt gelir', '10000.00'],
            ['Net kâr', '7300.00']
          ]
        }
      ]
    });
    const content = pdf.toString('utf8');

    expect(content.startsWith('%PDF-1.4')).toBe(true);
    expect(content).toContain('/Type /Catalog');
    expect(content).toContain('TAG Sürücü Finans Raporu');
    expect(content.trimEnd().endsWith('%%EOF')).toBe(true);
  });
});
