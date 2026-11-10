import {injectable, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {CourseRepository, LessonRepository} from '../repositories';

export interface AiTutorChatPayload {
  courseId: string;
  lessonId?: string;
  message: string;
  /** Focused topic from UI chips (BUG-022) */
  topic?: string;
  subject?: string;
  history?: {role: string; content: string}[];
}

@injectable({scope: BindingScope.TRANSIENT})
export class AiTutorService {
  constructor(
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @repository(LessonRepository)
    public lessonRepo: LessonRepository,
  ) {}

  /**
   * Interactive Socratic 1-on-1 AI Tutor response grounded in course curriculum
   */
  async getTutorReply(userId: string, payload: AiTutorChatPayload) {
    const course = await this.courseRepo.findOne({
      where: {id: payload.courseId, isActive: true, isDeleted: false},
      include: ['subject', 'gradeLevel'],
    });

    if (!course) {
      throw new HttpErrors.NotFound(`Course with ID '${payload.courseId}' not found.`);
    }

    const subjectLabel =
      payload.subject?.trim() ||
      (course as any).subject?.label ||
      'General';

    let lessonTopic =
      payload.topic?.trim() ||
      'Course Concepts & Fundamentals';
    if (payload.lessonId) {
      const lesson = await this.lessonRepo.findOne({
        where: {id: payload.lessonId, isActive: true, isDeleted: false},
      });
      if (lesson) {
        lessonTopic = lesson.title;
      }
    }

    // Prefer topic/subject from the message tags when FE embeds them
    const tagged = this.parseMessageTags(payload.message);
    if (tagged.topic) lessonTopic = tagged.topic;
    if (tagged.subject) {
      // keep explicit subject for context; course title may be unrelated (BUG-022)
    }
    const effectiveSubject = tagged.subject || subjectLabel;
    const userQuery = (tagged.cleanMessage || payload.message).toLowerCase();
    const displayQuestion = tagged.cleanMessage || payload.message;

    let reply = '';
    let suggestedQuestions: string[] = [];

    if (userQuery.includes('function') || userQuery.includes('relation')) {
      reply =
        `Great question about **${lessonTopic}** in ${effectiveSubject}!\n\n` +
        `Let's break down functions step-by-step:\n\n` +
        `A **function** is a relation where each input ($x$) has **exactly one** output ($y$).\n\n` +
        `💡 **Real-world analogy**:\n` +
        `Think of a vending machine:\n` +
        `1. Press button A1 (input) $\\rightarrow$ You always get Granola Bar (output).\n` +
        `2. If pressing A1 sometimes gives Soda and sometimes Granola, the machine is broken (*not a function*).\n\n` +
        `📊 **Vertical Line Test**:\n` +
        `On a coordinate plane, if any vertical line touches the graph more than once, it is not a function.\n\n` +
        `Would you like to try a practice example together?`;
      suggestedQuestions = [
        'Can you give me a practice problem to test my understanding?',
        'How does domain and range relate to functions?',
      ];
    } else if (userQuery.includes('slope') || userQuery.includes('linear') || userQuery.includes('solving for x')) {
      reply =
        `Focusing on **${lessonTopic}** (${effectiveSubject}):\n\n` +
        `**Slope ($m$)** measures the steepness and direction of a line:\n\n` +
        `$$\\text{Slope } m = \\frac{\\text{Rise}}{\\text{Run}} = \\frac{y_2 - y_1}{x_2 - x_1}$$\n\n` +
        `- **Positive slope**: Line rises from left to right.\n` +
        `- **Negative slope**: Line falls from left to right.\n` +
        `- **Zero slope**: Horizontal line ($y = c$).\n` +
        `- **Undefined slope**: Vertical line ($x = c$).\n\n` +
        `When solving for $x$, isolate the variable using inverse operations on both sides.\n\n` +
        `What coordinate points or equation are you currently working with?`;
      suggestedQuestions = [
        'How do I find the y-intercept from slope-intercept form?',
        'Can you walk me through solving a sample equation for x?',
      ];
    } else if (
      userQuery.includes('order of operations') ||
      userQuery.includes('pemdas') ||
      userQuery.includes('bodmas')
    ) {
      reply =
        `Let's tackle **${lessonTopic}** in ${effectiveSubject}.\n\n` +
        `Remember **PEMDAS**:\n` +
        `1. Parentheses\n` +
        `2. Exponents\n` +
        `3. Multiplication & Division (left to right)\n` +
        `4. Addition & Subtraction (left to right)\n\n` +
        `Try evaluating the expression one step at a time and tell me where you get stuck.`;
      suggestedQuestions = [
        'Can you show a worked PEMDAS example?',
        'What happens when multiplication and division appear together?',
      ];
    } else if (userQuery.includes('cell') || userQuery.includes('biology')) {
      reply =
        `Working on **${lessonTopic}** (${effectiveSubject}):\n\n` +
        `Cells are the basic units of life. Start by separating:\n` +
        `- **Prokaryotic** vs **eukaryotic** cells\n` +
        `- Key organelles (nucleus, mitochondria, membrane)\n` +
        `- How structure supports function\n\n` +
        `Which organelle or process should we unpack first?`;
      suggestedQuestions = [
        'What is the difference between plant and animal cells?',
        'Can you give a clue-first question about mitochondria?',
      ];
    } else {
      reply =
        `Hello! I am your **LucidPrep AI Tutor** for **${effectiveSubject}**, focusing on *${lessonTopic}*.\n\n` +
        `You asked: *"${displayQuestion}"*\n\n` +
        `To understand this concept effectively:\n` +
        `1. Identify the given variables and what the question is asking you to solve.\n` +
        `2. Apply the core ideas from your current topic (*${lessonTopic}*).\n` +
        `3. Verify your result by checking units, definitions, or substituting back.\n\n` +
        `Which specific step would you like to explore first?`;
      suggestedQuestions = [
        'Can you show me a worked example step by step?',
        'What are the key vocabulary terms for this topic?',
      ];
    }

    return {
      reply,
      suggestedQuestions,
      courseContext: {
        courseTitle: course.title,
        subject: effectiveSubject,
        currentTopic: lessonTopic,
      },
    };
  }

  private parseMessageTags(message: string): {
    subject?: string;
    topic?: string;
    cleanMessage: string;
  } {
    let remaining = message || '';
    let subject: string | undefined;
    let topic: string | undefined;

    const subjectMatch = remaining.match(/\[Subject:\s*([^\]]+)\]/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      remaining = remaining.replace(subjectMatch[0], '');
    }
    const topicMatch = remaining.match(/\[Topic:\s*([^\]]+)\]/i);
    if (topicMatch) {
      topic = topicMatch[1].trim();
      remaining = remaining.replace(topicMatch[0], '');
    }
    remaining = remaining.replace(/\[Grade\s*[^\]]*\]/gi, '').trim();

    return {subject, topic, cleanMessage: remaining};
  }
}
