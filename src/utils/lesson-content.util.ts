/**
 * Grade courses store weekly lesson bodies as:
 *   focus, overview, learningObjectives[], warmUp[], lessonContent[],
 *   vocabulary[{term,definition}], practice[], assignment, quizInfo
 *
 * Open-course JSON often only has module-level topic outlines. This maps
 * that outline into the same shape so the lesson player can render it.
 */

function asLines(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => asLines(item));
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.term === 'string' && obj.term.trim()) return [obj.term.trim()];
    const labeled = [obj.title, obj.text, obj.body, obj.name, obj.label, obj.focus]
      .find(v => typeof v === 'string' && (v as string).trim());
    if (typeof labeled === 'string') return [labeled.trim()];
    return [
      ...asLines(obj.topics),
      ...asLines(obj.lessons),
      ...asLines(obj.items),
    ];
  }
  return [];
}

function unique(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function isBoilerplate(line: string): boolean {
  return /^(topics|labs?|quiz|module test|virtual lab|\d+\s*questions?)$/i.test(
    line.trim(),
  );
}

function teachingLines(lines: string[]): string[] {
  return unique(lines.map(l => l.trim()).filter(l => l && !isBoilerplate(l)));
}

function asVocabulary(value: unknown, fallbackTerms: string[]): {term: string; definition: string}[] {
  if (Array.isArray(value) && value.length) {
    const mapped = value
      .map(item => {
        if (typeof item === 'string' && item.trim() && !isBoilerplate(item)) {
          return {
            term: item.trim(),
            definition: `Key term for this lesson: ${item.trim()}.`,
          };
        }
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const term = typeof obj.term === 'string' ? obj.term.trim() : '';
          const definition =
            typeof obj.definition === 'string' ? obj.definition.trim() : '';
          if (term) {
            return {
              term,
              definition: definition || `Key term for this lesson: ${term}.`,
            };
          }
        }
        return null;
      })
      .filter((v): v is {term: string; definition: string} => !!v);
    if (mapped.length) return mapped;
  }
  return fallbackTerms.slice(0, 8).map(term => ({
    term,
    definition: `Workforce topic covered in this lesson: ${term}.`,
  }));
}

/**
 * Fill empty open-course lesson fields so they match curriculum lesson content.
 * Already-complete curriculum payloads are returned unchanged.
 */
export function normalizeLessonContent(raw: unknown): any {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const content = raw as Record<string, any>;

  const existingSections = asLines(content.lessonContent).filter(l => !isBoilerplate(l));
  const hasCurriculumBody =
    typeof content.overview === 'string' &&
    content.overview.trim().length > 0 &&
    existingSections.length > 0 &&
    Array.isArray(content.learningObjectives) &&
    content.learningObjectives.length > 0;

  if (hasCurriculumBody && content.source !== 'open_courses_json') {
    return content;
  }

  const topicLines = teachingLines([
    ...asLines(content.moduleTopics),
    ...asLines(content.topics),
    ...asLines(content.sourceContent),
    ...asLines(content.source_content),
  ]);
  const labLines = teachingLines([
    ...asLines(content.moduleLabs),
    ...asLines(content.labs),
    ...asLines(content.labs_and_practical_activities),
  ]);

  const lessonContent = existingSections.length
    ? unique(existingSections)
    : topicLines;

  const objectives = teachingLines(asLines(content.learningObjectives));
  const learningObjectives = objectives.length
    ? objectives
    : topicLines.slice(0, 6).map(topic => `Explain and apply: ${topic}.`);

  const focus =
    (typeof content.focus === 'string' && content.focus.trim()) ||
    topicLines[0] ||
    content.quizTitle ||
    null;

  const overview =
    (typeof content.overview === 'string' && content.overview.trim()) ||
    (topicLines.length
      ? `This lesson covers ${topicLines.slice(0, 5).join(', ')}.`
      : null);

  const warmUp = teachingLines(asLines(content.warmUp));
  const practice = teachingLines(asLines(content.practice));
  const assignment =
    typeof content.assignment === 'string' && content.assignment.trim()
      ? content.assignment.trim()
      : labLines[0]
        ? `Complete the practical activity: ${labLines[0]}.`
        : topicLines[0]
          ? `Apply this week's topic in a short workplace scenario: ${topicLines[0]}.`
          : null;

  return {
    ...content,
    focus,
    overview,
    learningObjectives,
    warmUp: warmUp.length
      ? warmUp
      : focus
        ? [
            `Recall what you already know about ${focus}.`,
            'Write one question you expect this lesson to answer.',
          ]
        : [],
    lessonContent,
    vocabulary: asVocabulary(content.vocabulary, topicLines),
    practice: practice.length
      ? practice
      : labLines.length
        ? labLines
        : ['Review the lesson topics and complete the weekly practice check.'],
    assignment,
    quizInfo: content.quizInfo ?? null,
  };
}
