export interface PdfSection {
  title: string;
  lines: string[];
}

/**
 * Gera um documento PDF executivo multipágina nativo com cabeçalho institucional A Nova Moeda,
 * data de emissão, seções organizadas, formatação executiva e paginação no rodapé (§15.3).
 */
export function generateArenaReportPdf({
  documentTitle,
  subtitle,
  sections,
}: {
  documentTitle: string;
  subtitle: string;
  sections: PdfSection[];
}): Buffer {
  const clean = (str: string) =>
    str
      .replace(/[()\\]/g, "")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
      .trim();

  const wrapLine = (text: string, maxChars = 88): string[] => {
    const words = clean(text).split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      if ((current + " " + w).trim().length > maxChars) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = (current + " " + w).trim();
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
  };

  const pagesOps: string[][] = [];
  let currentOps: string[] = [];
  let y = 710;

  const startNewPage = () => {
    if (currentOps.length > 0) {
      pagesOps.push(currentOps);
    }
    currentOps = [];
    // Cabeçalho institucional Verde Escuro & Dourado A Nova Moeda
    currentOps.push("0.04 0.08 0.05 rg 0 742 595 100 re f");
    currentOps.push("0.83 0.77 0.66 RG 1 w 40 742 m 555 742 l S");
    currentOps.push(
      `BT /F2 8.5 Tf 0.83 0.77 0.66 rg 42 812 Td (A NOVA MOEDA · ECONOMIA DA SOLIDAO · ARENA UEFS) Tj ET`
    );
    currentOps.push(
      `BT /F2 15 Tf 0.97 0.87 0.79 rg 42 786 Td (${clean(
        documentTitle.toUpperCase()
      )}) Tj ET`
    );
    currentOps.push(
      `BT /F1 9 Tf 0.83 0.77 0.66 rg 42 764 Td (${clean(subtitle)}) Tj ET`
    );
    y = 714;
  };

  startNewPage();

  for (const section of sections) {
    if (y < 95) {
      startNewPage();
    }
    y -= 8;
    currentOps.push(
      `BT /F2 10.5 Tf 0.08 0.33 0.18 rg 42 ${y} Td (${clean(
        section.title.toUpperCase()
      )}) Tj ET`
    );
    y -= 5;
    currentOps.push(`0.83 0.77 0.66 RG 0.8 w 42 ${y} m 553 ${y} l S`);
    y -= 14;

    for (const rawLine of section.lines) {
      const wrapped = wrapLine(rawLine, 88);
      for (const line of wrapped) {
        if (y < 60) {
          startNewPage();
        }
        currentOps.push(
          `BT /F1 9 Tf 0.12 0.14 0.12 rg 42 ${y} Td (${clean(line)}) Tj ET`
        );
        y -= 12;
      }
      y -= 1.5;
    }
    y -= 6;
  }

  if (currentOps.length > 0) {
    pagesOps.push(currentOps);
  }

  const issuedAt = new Date().toLocaleString("pt-BR");
  const totalPages = pagesOps.length;

  for (let i = 0; i < totalPages; i++) {
    const ops = pagesOps[i];
    ops.push("0.83 0.77 0.66 RG 0.5 w 42 38 m 553 38 l S");
    ops.push(
      `BT /F1 8 Tf 0.45 0.45 0.45 rg 42 24 Td (${clean(
        `Emitido em ${issuedAt} · Plataforma Operacional Arena A Nova Moeda (UEFS)`
      )}) Tj ET`
    );
    ops.push(
      `BT /F1 8 Tf 0.45 0.45 0.45 rg 490 24 Td (${clean(
        `Pagina ${i + 1} de ${totalPages}`
      )}) Tj ET`
    );
  }

  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  for (let i = 0; i < totalPages; i++) {
    pageObjectIds.push(5 + i * 2);
  }

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${totalPages} >>\nendobj\n`
  );
  objects.push(
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"
  );
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"
  );

  for (let i = 0; i < totalPages; i++) {
    const pageObjId = 5 + i * 2;
    const contentObjId = pageObjId + 1;
    const stream = pagesOps[i].join("\n");
    objects.push(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentObjId} 0 obj\n<< /Length ${Buffer.byteLength(
        stream,
        "latin1"
      )} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  }

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

export function buildCsvBuffer(headers: string[], rows: string[][]): Buffer {
  const escapeCsv = (val: string) => {
    const cleaned = String(val ?? "").replace(/"/g, '""');
    return `"${cleaned}"`;
  };

  const lines = [
    headers.map(escapeCsv).join(";"),
    ...rows.map((r) => r.map(escapeCsv).join(";")),
  ];

  // Adiciona BOM UTF-8 para abertura perfeita no Excel em Português
  return Buffer.from("\uFEFF" + lines.join("\r\n"), "utf-8");
}

export function buildSpreadsheetXmlBuffer(
  sheetName: string,
  headers: string[],
  rows: string[][]
): Buffer {
  const escapeXml = (str: string) =>
    String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headerCells = headers
    .map(
      (h) =>
        `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${escapeXml(
          h
        )}</Data></Cell>`
    )
    .join("");

  const bodyRows = rows
    .map(
      (r) =>
        `<Row>${r
          .map(
            (c) =>
              `<Cell><Data ss:Type="String">${escapeXml(c)}</Data></Cell>`
          )
          .join("")}</Row>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="sHeader">
   <Font ss:Bold="1" ss:Color="#F7DECA"/>
   <Interior ss:Color="#0A150D" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;

  return Buffer.from(xml, "utf-8");
}
