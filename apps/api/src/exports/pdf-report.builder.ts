export interface PdfReportSection {
  rows: Array<[string, string | number | boolean | Date | null | undefined]>;
  title: string;
}

export interface PdfReportInput {
  sections: PdfReportSection[];
  subtitle: string;
  title: string;
}

export class PdfReportBuilder {
  build(input: PdfReportInput) {
    const pages = this.paginate(this.buildLines(input));
    const objects: string[] = [];
    const pageObjectIds: number[] = [];

    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('');
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    for (const page of pages) {
      const content = this.buildPageContent(page);
      const contentObjectId = objects.length + 2;
      const pageObjectId = objects.length + 1;

      pageObjectIds.push(pageObjectId);
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`
      );
      objects.push(`<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`);
    }

    objects[1] =
      `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

    return this.buildPdf(objects);
  }

  private buildLines(input: PdfReportInput) {
    const lines: Array<{ bold?: boolean; text: string }> = [
      {
        bold: true,
        text: input.title
      },
      {
        text: input.subtitle
      },
      {
        text: ''
      }
    ];

    for (const section of input.sections) {
      lines.push({
        bold: true,
        text: section.title
      });

      for (const [label, value] of section.rows) {
        lines.push({
          text: `${label}: ${this.formatValue(value)}`
        });
      }

      lines.push({
        text: ''
      });
    }

    return lines;
  }

  private paginate(lines: Array<{ bold?: boolean; text: string }>) {
    const pages: Array<Array<{ bold?: boolean; text: string }>> = [];
    const maxLinesPerPage = 42;

    for (let index = 0; index < lines.length; index += maxLinesPerPage) {
      pages.push(lines.slice(index, index + maxLinesPerPage));
    }

    return pages.length > 0 ? pages : [[{ text: '' }]];
  }

  private buildPageContent(lines: Array<{ bold?: boolean; text: string }>) {
    const commands: string[] = ['BT'];
    let y = 790;

    for (const line of lines) {
      const fontSize = line.bold ? 13 : 10;

      commands.push(`/F1 ${fontSize} Tf`);
      commands.push(`1 0 0 1 50 ${y} Tm`);
      commands.push(`(${this.escapePdfText(line.text)}) Tj`);
      y -= line.bold ? 19 : 15;
    }

    commands.push('ET');

    return commands.join('\n');
  }

  private buildPdf(objects: string[]) {
    const parts: Buffer[] = [Buffer.from('%PDF-1.4\n')];
    const offsets: number[] = [0];
    let offset = parts[0].length;

    objects.forEach((object, index) => {
      offsets.push(offset);

      const serialized = Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`);

      parts.push(serialized);
      offset += serialized.length;
    });

    const xrefOffset = offset;
    const xref = [
      `xref`,
      `0 ${objects.length + 1}`,
      '0000000000 65535 f ',
      ...offsets
        .slice(1)
        .map((item) => `${String(item).padStart(10, '0')} 00000 n `),
      'trailer',
      `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
      'startxref',
      String(xrefOffset),
      '%%EOF'
    ].join('\n');

    parts.push(Buffer.from(xref));

    return Buffer.concat(parts);
  }

  private formatValue(value: string | number | boolean | Date | null | undefined) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return String(value);
  }

  private escapePdfText(value: string) {
    return this.toWinAnsi(value)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .slice(0, 120);
  }

  private toWinAnsi(value: string) {
    return value
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '');
  }
}
