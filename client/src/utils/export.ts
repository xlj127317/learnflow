/**
 * 将数据数组转为 CSV 字符串并触发下载
 */
export function exportCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[],
) {
  if (data.length === 0) return;

  const cols = columns || Object.keys(data[0]).map(k => ({ key: k as keyof T, label: k as string }));
  const header = cols.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    cols.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(','),
  );

  const csv = '\uFEFF' + [header, ...rows].join('\n'); // BOM for Excel
  download(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * 将数据导出为 JSON 并触发下载
 */
export function exportJSON<T>(data: T[], filename: string) {
  const json = JSON.stringify(data, null, 2);
  download(json, `${filename}.json`, 'application/json');
}

function download(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
