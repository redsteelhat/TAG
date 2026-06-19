export type WorkbookCell = string | number | boolean | Date | null | undefined;
export type WorkbookRow = WorkbookCell[];

export interface WorkbookSheet {
  name: string;
  rows: WorkbookRow[];
}

export class XlsxWorkbookBuilder {
  build(sheets: WorkbookSheet[]) {
    const safeSheets = sheets.length > 0 ? sheets : [{ name: 'Sayfa1', rows: [] }];
    const files = new Map<string, Buffer>();

    files.set('[Content_Types].xml', Buffer.from(this.buildContentTypes(safeSheets)));
    files.set('_rels/.rels', Buffer.from(this.buildRootRels()));
    files.set('xl/workbook.xml', Buffer.from(this.buildWorkbook(safeSheets)));
    files.set('xl/_rels/workbook.xml.rels', Buffer.from(this.buildWorkbookRels(safeSheets)));

    safeSheets.forEach((sheet, index) => {
      files.set(
        `xl/worksheets/sheet${index + 1}.xml`,
        Buffer.from(this.buildWorksheet(sheet.rows))
      );
    });

    return this.zip(files);
  }

  private buildContentTypes(sheets: WorkbookSheet[]) {
    const sheetOverrides = sheets
      .map(
        (_, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetOverrides}
</Types>`;
  }

  private buildRootRels() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  private buildWorkbook(sheets: WorkbookSheet[]) {
    const sheetXml = sheets
      .map(
        (sheet, index) =>
          `<sheet name="${this.escapeAttribute(this.truncateSheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetXml}</sheets>
</workbook>`;
  }

  private buildWorkbookRels(sheets: WorkbookSheet[]) {
    const relationships = sheets
      .map(
        (_, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relationships}
</Relationships>`;
  }

  private buildWorksheet(rows: WorkbookRow[]) {
    const rowsXml = rows
      .map((row, rowIndex) => {
        const cells = row
          .map((cell, columnIndex) =>
            this.buildCell(cell, `${this.columnName(columnIndex + 1)}${rowIndex + 1}`)
          )
          .join('');

        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
  }

  private buildCell(cell: WorkbookCell, reference: string) {
    if (cell === null || cell === undefined) {
      return `<c r="${reference}"/>`;
    }

    if (typeof cell === 'number' && Number.isFinite(cell)) {
      return `<c r="${reference}" t="n"><v>${cell}</v></c>`;
    }

    if (typeof cell === 'boolean') {
      return `<c r="${reference}" t="b"><v>${cell ? 1 : 0}</v></c>`;
    }

    const value = cell instanceof Date ? cell.toISOString() : String(cell);

    return `<c r="${reference}" t="inlineStr"><is><t>${this.escapeText(value)}</t></is></c>`;
  }

  private zip(files: Map<string, Buffer>) {
    const fileParts: Buffer[] = [];
    const centralDirectoryParts: Buffer[] = [];
    let offset = 0;

    for (const [fileName, content] of files.entries()) {
      const name = Buffer.from(fileName);
      const crc = this.crc32(content);
      const localHeader = Buffer.alloc(30);

      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(content.length, 18);
      localHeader.writeUInt32LE(content.length, 22);
      localHeader.writeUInt16LE(name.length, 26);
      localHeader.writeUInt16LE(0, 28);

      fileParts.push(localHeader, name, content);

      const centralHeader = Buffer.alloc(46);

      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(content.length, 20);
      centralHeader.writeUInt32LE(content.length, 24);
      centralHeader.writeUInt16LE(name.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);

      centralDirectoryParts.push(centralHeader, name);
      offset += localHeader.length + name.length + content.length;
    }

    const centralDirectory = Buffer.concat(centralDirectoryParts);
    const end = Buffer.alloc(22);

    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(files.size, 8);
    end.writeUInt16LE(files.size, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([...fileParts, centralDirectory, end]);
  }

  private crc32(content: Buffer) {
    let crc = 0xffffffff;

    for (const byte of content) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  private columnName(index: number) {
    let column = '';
    let current = index;

    while (current > 0) {
      const remainder = (current - 1) % 26;
      column = String.fromCharCode(65 + remainder) + column;
      current = Math.floor((current - 1) / 26);
    }

    return column;
  }

  private truncateSheetName(name: string) {
    return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sayfa';
  }

  private escapeAttribute(value: string) {
    return this.escapeText(value).replace(/"/g, '&quot;');
  }

  private escapeText(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\u0000/g, '');
  }
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;

  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  return crc >>> 0;
});
