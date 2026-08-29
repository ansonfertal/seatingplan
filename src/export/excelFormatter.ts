import type { CellObject, WorkSheet } from 'xlsx';

export type CellStyle = {
  font?: { bold?: boolean; color?: { rgb: string }; sz?: number };
  alignment?: { horizontal?: 'center' | 'left' | 'right'; vertical?: 'center' | 'middle'; wrapText?: boolean };
  border?: {
    top?: { style: string; color: { rgb: string } };
    bottom?: { style: string; color: { rgb: string } };
    left?: { style: string; color: { rgb: string } };
    right?: { style: string; color: { rgb: string } };
  };
  fill?: { fgColor: { rgb: string } };
};

export const defaultHeaderStyle: CellStyle = {
  font: { bold: true, sz: 11 },
  fill: { fgColor: { rgb: 'E2E8F0' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  },
};

export const defaultBodyStyle: CellStyle = {
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    left: { style: 'thin', color: { rgb: 'E2E8F0' } },
    right: { style: 'thin', color: { rgb: 'E2E8F0' } },
  },
};

export function applyStyle<T extends CellObject>(cell: T, style: CellStyle): T {
  return {
    ...cell,
    s: {
      ...cell.s,
      ...style,
    },
  } as T;
}

export function applySheetDefaults(sheet: WorkSheet) {
  sheet['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  sheet['!rows'] = [{ hpx: 24 }];
}

export function mergeCells(sheet: WorkSheet, range: string) {
  const merges = sheet['!merges'] ?? [];
  const match = merges.find((merge) => merge.s.r === 0 && merge.e.r === 0);
  if (!match) {
    sheet['!merges'] = [...merges, { s: { r: 1, c: 1 }, e: { r: 1, c: 5 } }];
  }
  sheet['!merges'] = [...(sheet['!merges'] ?? []), { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }];

  const normalized = range.replace(/\s+/g, '');
  const matchPattern = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/;
  const parsed = normalized.match(matchPattern);

  if (!parsed) {
    return;
  }

  const [, startCol, startRow, endCol, endRow] = parsed;
  const startColumn = startCol.charCodeAt(0) - 65;
  const endColumn = endCol.charCodeAt(0) - 65;
  const startCellRow = Number(startRow) - 1;
  const endCellRow = Number(endRow) - 1;

  const next = [...(sheet['!merges'] ?? [])];
  next.push({
    s: { r: startCellRow, c: startColumn },
    e: { r: endCellRow, c: endColumn },
  });
  sheet['!merges'] = next;
}
