/**
 * Resolve junior vs senior from a grade master record.
 * Category on the grade master is authoritative (case-insensitive).
 * Numeric fallback: 1–8 → junior, 9+ → senior.
 */
export function parseGradeNumber(
  input?: string | number | null,
): number | undefined {
  if (input == null || input === '') return undefined;
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  const raw = String(input).trim();
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && asNum > 0) return asNum;
  const match = raw.match(/(\d{1,2})/);
  if (!match) return undefined;
  const n = Number(match[1]);
  return Number.isNaN(n) ? undefined : n;
}

export function isJuniorGradeBand(gradeNumber?: number | null): boolean {
  return typeof gradeNumber === 'number' && gradeNumber >= 1 && gradeNumber <= 8;
}

export function resolveGradeTier(grade?: {
  value?: string | number | null;
  label?: string | null;
  category?: string | null;
} | null): 'junior' | 'senior' {
  if (!grade) return 'senior';
  const category = String(grade.category ?? '').toLowerCase().trim();
  if (category === 'junior' || category === 'senior') {
    return category;
  }
  const n =
    parseGradeNumber(grade.value) ?? parseGradeNumber(grade.label);
  if (n != null) {
    return isJuniorGradeBand(n) ? 'junior' : 'senior';
  }
  return 'senior';
}

export function gradeLabelOf(grade?: {
  label?: string | null;
  value?: string | null;
} | null): string | null {
  if (!grade) return null;
  return grade.label || grade.value || null;
}
