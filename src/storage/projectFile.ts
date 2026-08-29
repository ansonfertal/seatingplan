export type ProjectFilePayload = {
  exportedAt: string;
  version: number;
  data: Record<string, unknown>;
};

export function downloadProjectJson(data: Record<string, unknown>, fileName = 'exam-seating-project.json') {
  const payload: ProjectFilePayload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function importProjectJson(file: File): Promise<Record<string, unknown>> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ProjectFilePayload | Record<string, unknown>;

  if (parsed && typeof parsed === 'object' && 'data' in parsed && parsed.data && typeof parsed.data === 'object') {
    return parsed.data as Record<string, unknown>;
  }

  if (parsed && typeof parsed === 'object') {
    return parsed as Record<string, unknown>;
  }

  throw new Error('The project file is invalid or empty.');
}
