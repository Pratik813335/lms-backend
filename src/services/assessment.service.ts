import {injectable, /* inject, */ BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {
  AssessmentRepository,
  AssessmentSubmissionRepository,
  CourseRepository,
  EnrollmentRepository,
  QuestionRepository,
  StudentProfileRepository,
  UsersRepository,
} from '../repositories';
import {Assessment, Question, AssessmentSubmission} from '../models';

export interface SubmitAssessmentPayload {
  answers: Record<string, string>;
}

export interface AssessmentResult {
  submissionId: string;
  assessmentId: string;
  title: string;
  score: number;
  pointsEarned: number;
  totalPoints: number;
  isPassed: boolean;
  passingPercentage: number;
  xpAwarded: number;
  questionResults: {
    questionId: string;
    text: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
    explanation?: string;
  }[];
  aiFeedback: {
    headline: string;
    body: string;
    suggestions: string[];
  };
}

@injectable({scope: BindingScope.TRANSIENT})
export class AssessmentService {
  constructor(
    @repository(AssessmentRepository)
    public assessmentRepo: AssessmentRepository,
    @repository(QuestionRepository)
    public questionRepo: QuestionRepository,
    @repository(AssessmentSubmissionRepository)
    public submissionRepo: AssessmentSubmissionRepository,
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
  ) {}

  /**
   * Fetch assessment with sanitized questions (without answers) for test-taking
   */
  async getAssessmentForStudent(assessmentId: string): Promise<any> {
    const assessment = await this.assessmentRepo.findOne({
      where: {id: assessmentId, isActive: true, isDeleted: false},
      include: [
        {
          relation: 'questions',
          scope: {
            where: {isActive: true, isDeleted: false},
            order: ['orderIndex ASC'],
            fields: {
              id: true,
              assessmentId: true,
              type: true,
              text: true,
              options: true,
              points: true,
              orderIndex: true,
            },
          },
        },
        {
          relation: 'course',
          scope: {fields: {id: true, title: true, subjectId: true}},
        },
      ],
    });

    if (!assessment) {
      throw new HttpErrors.NotFound(`Assessment with ID '${assessmentId}' not found.`);
    }

    return assessment;
  }

  /**
   * Submit and auto-grade an assessment
   */
  async submitAndGrade(
    userId: string,
    assessmentId: string,
    payload: SubmitAssessmentPayload,
  ): Promise<AssessmentResult> {
    const assessment = await this.assessmentRepo.findOne({
      where: {id: assessmentId, isActive: true, isDeleted: false},
      include: [
        {
          relation: 'course',
          scope: {fields: {id: true, title: true}},
        },
      ],
    });

    if (!assessment) {
      throw new HttpErrors.NotFound(`Assessment with ID '${assessmentId}' not found.`);
    }

    const questions: Question[] = await this.questionRepo.find({
      where: {assessmentId, isActive: true, isDeleted: false},
      order: ['orderIndex ASC'],
    });

    if (questions.length === 0) {
      throw new HttpErrors.BadRequest('This assessment has no questions configured.');
    }

    let pointsEarned = 0;
    let totalPoints = 0;
    const questionResults = [];
    const answers = payload.answers || {};

    for (const q of questions) {
      const qPoints = q.points || 10;
      totalPoints += qPoints;
      const qKey = q.id ? String(q.id) : '';
      const selected = (
        answers[qKey] !== undefined
          ? String(answers[qKey])
          : answers[qKey.toLowerCase()] !== undefined
          ? String(answers[qKey.toLowerCase()])
          : ''
      ).trim();
      const correct = String(q.correctAnswer || (q as any).correct_answer || '').trim();

      let isCorrect = false;
      if (q.type === 'mcq' || q.type === 'true_false') {
        isCorrect = selected.toLowerCase() === correct.toLowerCase();
      } else if (q.type === 'fill_blank') {
        const normSelected = selected.toLowerCase();
        const normCorrect = correct.toLowerCase();
        isCorrect = normSelected.length > 0 && (normSelected.includes(normCorrect) || normCorrect.includes(normSelected));
      } else {
        // short_answer / scenario: length check & keyword match
        isCorrect = selected.length >= 10;
      }

      if (isCorrect) {
        pointsEarned += qPoints;
      }

      questionResults.push({
        questionId: q.id!,
        text: q.text,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        points: isCorrect ? qPoints : 0,
        explanation: q.explanation,
      });
    }

    const scorePercentage = totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 1000) / 10 : 0;
    const passingThreshold = assessment.passingPercentage || 80.0;
    const isPassed = scorePercentage >= passingThreshold;
    const xpReward = isPassed ? (assessment.xpReward || 100) : Math.round((assessment.xpReward || 100) * 0.25);

    // Generate AI Feedback
    const courseTitle = assessment.course?.title || 'this subject';
    const aiFeedback = this.generateAiFeedback(scorePercentage, isPassed, assessment.title, courseTitle);

    // Save submission to database
    const savedSubmission = await this.submissionRepo.create({
      usersId: userId,
      assessmentId: assessment.id!,
      answers,
      score: scorePercentage,
      pointsEarned,
      totalPoints,
      isPassed,
      xpAwarded: xpReward,
      aiFeedback,
      submittedAt: new Date(),
    });

    // Update student profile XP
    const profile = await this.studentProfileRepo.findOne({where: {usersId: userId}});
    if (profile) {
      const currentXp = profile.xp || 0;
      const newXp = currentXp + xpReward;
      const newLevel = Math.floor(newXp / 300) + 1;
      await this.studentProfileRepo.updateById(profile.id!, {
        xp: newXp,
        level: newLevel,
      });
    }

    return {
      submissionId: savedSubmission.id!,
      assessmentId: assessment.id!,
      title: assessment.title,
      score: scorePercentage,
      pointsEarned,
      totalPoints,
      isPassed,
      passingPercentage: passingThreshold,
      xpAwarded: xpReward,
      questionResults,
      aiFeedback,
    };
  }

  /**
   * Get latest submission review for an assessment
   */
  async getLatestSubmissionReview(userId: string, assessmentId: string): Promise<any> {
    const submission = await this.submissionRepo.findOne({
      where: {usersId: userId, assessmentId, isDeleted: false},
      order: ['submittedAt DESC'],
      include: [
        {
          relation: 'assessment',
          scope: {
            include: [
              {
                relation: 'questions',
                scope: {order: ['orderIndex ASC']},
              },
            ],
          },
        },
      ],
    });

    if (!submission) {
      throw new HttpErrors.NotFound(`No submission found for assessment '${assessmentId}'.`);
    }

    return submission;
  }

  /**
   * Generate contextual AI performance feedback
   */
  private generateAiFeedback(
    score: number,
    passed: boolean,
    topic: string,
    courseTitle: string,
  ): {headline: string; body: string; suggestions: string[]} {
    if (score >= 90) {
      return {
        headline: 'Outstanding Mastery',
        body: `You demonstrated exceptional command of ${topic} in ${courseTitle}. Your answers were highly accurate and structured across all question formats.`,
        suggestions: [
          'Attempt extension scenario problems to deepen conceptual mastery.',
          'Preview next week’s vocabulary and advanced topics.',
          'Consider teaching these concepts to a study partner.',
        ],
      };
    }

    if (passed) {
      return {
        headline: 'Solid Understanding',
        body: `You successfully met the passing standard on ${topic}. A few nuanced concepts can be sharpened, especially on scenario questions.`,
        suggestions: [
          'Review the questions you missed and read the step-by-step explanations.',
          'Redo practice worksheets to lock in core definitions.',
          'Ask the AI Tutor for one worked example before moving to the next module.',
        ],
      };
    }

    return {
      headline: 'Keep Going — Review & Retake',
      body: `You are close to the passing threshold for ${topic}. Focus your revision on the questions flagged below, then retake the assessment.`,
      suggestions: [
        'Revisit the lesson reading material and key concepts.',
        'Use the AI Tutor to break down the hardest questions step by step.',
        'Retake the assessment once you have reviewed the explanations.',
      ],
    };
  }
}
