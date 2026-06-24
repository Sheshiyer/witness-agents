export interface NotebookLMArtifactRow {
  id: string;
  type: string;
  status: string;
  title: string;
  createdAt: string;
}

export function selectCompletedArtifact(
  rows: NotebookLMArtifactRow[],
  typeNeedle: string,
  titleNeedle?: string,
  usedArtifactIds: Set<string> = new Set(),
): NotebookLMArtifactRow | undefined {
  const normalizedType = typeNeedle.replace(/-/g, '_');
  const candidates = rows
    .filter(row => row.type.includes(normalizedType) && row.status === 'completed')
    .filter(row => !usedArtifactIds.has(row.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (titleNeedle) {
    const titleMatch = candidates.find(row => row.title.toLowerCase().includes(titleNeedle.toLowerCase()));
    if (titleMatch) return titleMatch;
  }

  return candidates[0];
}
