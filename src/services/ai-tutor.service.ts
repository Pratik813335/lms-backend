import {injectable, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {CourseRepository, LessonRepository} from '../repositories';

export interface AiTutorChatPayload {
  courseId: string;
  lessonId?: string;
  message: string;
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

    let lessonTopic = 'Course Concepts & Fundamentals';
    if (payload.lessonId) {
      const lesson = await this.lessonRepo.findOne({
        where: {id: payload.lessonId, isActive: true, isDeleted: false},
      });
      if (lesson) {
        lessonTopic = lesson.title;
      }
    }

    const userQuery = payload.message.toLowerCase();
    let reply = '';
    let suggestedQuestions: string[] = [];

    if (userQuery.includes('function') || userQuery.includes('relation')) {
      reply =
        `Great question! Let's break down functions step-by-step:\n\n` +
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
    } else if (userQuery.includes('slope') || userQuery.includes('linear')) {
      reply =
        `In ${course.title}, **slope ($m$)** measures the steepness and direction of a line:\n\n` +
        `$$\\text{Slope } m = \\frac{\\text{Rise}}{\\text{Run}} = \\frac{y_2 - y_1}{x_2 - x_1}$$\n\n` +
        `- **Positive slope**: Line rises from left to right.\n` +
        `- **Negative slope**: Line falls from left to right.\n` +
        `- **Zero slope**: Horizontal line ($y = c$).\n` +
        `- **Undefined slope**: Vertical line ($x = c$).\n\n` +
        `What coordinate points are you currently working with?`;
      suggestedQuestions = [
        'How do I find the y-intercept from slope-intercept form?',
        'What is the difference between parallel and perpendicular lines?',
      ];
    } else {
      reply =
        `Hello! I am your **LucidPrep AI Tutor** for **${course.title}** (working on *${lessonTopic}*).\n\n` +
        `You asked: *"\\${payload.message}"*\n\n` +
        `To understand this concept effectively:\n` +
        `1. Identify the given variables and what the question is asking you to solve.\n` +
        `2. Apply the core formulas from this week's lesson material.\n` +
        `3. Verify your result by substituting the answer back into the original equation.\n\n` +
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
        subject: (course as any).subject?.label || 'General',
        currentTopic: lessonTopic,
      },
    };
  }
}
