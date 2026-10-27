/**
 * Sanitizes and escapes a cell value for RFC 4180 CSV export,
 * preventing spreadsheet formula injection (=, +, -, @, \t, \r)
 * and safely escaping embedded double quotes and newlines.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value);

  // Neutralize CSV formula injection on non-numeric strings starting with formula triggers
  if (
    str.length > 0 &&
    ['=', '+', '-', '@', '\t', '\r'].includes(str[0]) &&
    !/^[-+]?\d+(\.\d+)?%?$/.test(str)
  ) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildCsvString(
  headers: string[],
  rows: Array<Array<unknown>>
): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
  const rowLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','));
  return [headerLine, ...rowLines].join('\n');
}

export function triggerBrowserDownload(
  content: string,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;'
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Fallback to encodeURIComponent data URI if Blob is unavailable
    const encoded = `data:${mimeType},${encodeURIComponent(content)}`;
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function safeLoadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeSaveStorage<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
