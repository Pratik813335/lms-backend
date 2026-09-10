import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {
  AssessmentRepository,
  AssessmentSubmissionRepository,
  CourseRepository,
  GradeLevelsRepository,
  QuestionRepository,
  StudentProfileRepository,
  SubjectsRepository,
  UsersRepository,
} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class TestPrepService {
  constructor(
    @repository(SubjectsRepository)
    public subjectsRepo: SubjectsRepository,
    @repository(AssessmentRepository)
    public assessmentRepo: AssessmentRepository,
    @repository(QuestionRepository)
    public questionRepo: QuestionRepository,
    @repository(AssessmentSubmissionRepository)
    public submissionRepo: AssessmentSubmissionRepository,
    @repository(CourseRepository)
    public courseRepo: CourseRepository,
    @repository(GradeLevelsRepository)
    public gradeLevelsRepo: GradeLevelsRepository,
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
    @repository(UsersRepository)
    public usersRepo: UsersRepository,
  ) {}

  /**
   * Get 3 core test prep subjects (Math, ELA, Science) with practice sets count
   */
  async getTestPrepSubjects(gradeLevelId?: string) {
    const subjects = await this.subjectsRepo.find({
      where: {isTestPrep: true, isActive: true, isDeleted: false},
      order: ['label ASC'],
    });

    const results = await Promise.all(
      subjects.map(async sub => {
        // Find courses or assessments under this subject
        const courses = await this.courseRepo.find({
          where: {subjectId: sub.id, isActive: true, isDeleted: false},
        });
        const courseIds = courses.map(c => c.id!);

        let assessmentCount = 0;
        let questionCount = 0;

        if (courseIds.length > 0) {
          const assessments = await this.assessmentRepo.find({
            where: {courseId: {inq: courseIds}, isActive: true, isDeleted: false},
          });
          assessmentCount = assessments.length;

          const assessmentIds = assessments.map(a => a.id!);
          if (assessmentIds.length > 0) {
            const questions = await this.questionRepo.find({
              where: {assessmentId: {inq: assessmentIds}, isActive: true, isDeleted: false},
            });
            questionCount = questions.length;
          }
        }

        return {
          id: sub.id,
          label: sub.label,
          value: sub.value,
          description: sub.description || `Core ${sub.label} test preparation and practice drills`,
          icon: sub.value === 'math' ? 'Sigma' : sub.value === 'ela' ? 'BookOpen' : 'Atom',
          totalPracticeSets: Math.max(assessmentCount, 6),
          totalQuestions: Math.max(questionCount, 60),
          isTestPrep: true,
        };
      }),
    );

    return results;
  }

  /**
   * Get test prep practice assessments for a subject
   */
  async getTestPrepAssessments(subjectId: string, gradeLevelId?: string) {
    const subject = await this.subjectsRepo.findOne({
      where: {id: subjectId, isDeleted: false},
    });
    if (!subject) {
      throw new HttpErrors.NotFound(`Subject with ID '${subjectId}' not found.`);
    }

    const courses = await this.courseRepo.find({
      where: {subjectId, isActive: true, isDeleted: false},
    });
    const courseIds = courses.map(c => c.id!);

    let assessments: any[] = [];
    if (courseIds.length > 0) {
      assessments = await this.assessmentRepo.find({
        where: {courseId: {inq: courseIds}, isActive: true, isDeleted: false},
        include: [
          {relation: 'questions', scope: {where: {isActive: true, isDeleted: false}}},
          {relation: 'course', scope: {fields: {id: true, title: true, credits: true}}},
        ],
        order: ['title ASC'],
      });
    }

    return {
      subject: {
        id: subject.id,
        label: subject.label,
        value: subject.value,
      },
      assessments: assessments.map(a => {
        const plain = typeof a.toJSON === 'function' ? a.toJSON() : a;
        return {
          id: plain.id,
          title: plain.title,
          type: plain.type, // 'practice_test' | 'quiz' | 'checkpoint'
          description: plain.description,
          passingPercentage: plain.passingPercentage || 80.0,
          timeLimitMinutes: plain.timeLimitMinutes || 20,
          questionCount: plain.questions?.length || 0,
          xpReward: plain.xpReward || 100,
          difficulty: plain.passingPercentage && plain.passingPercentage > 85 ? 'Advanced' : 'Standard',
        };
      }),
    };
  }

  /**
   * Get student personalized test prep dashboard metrics
   */
  async getStudentTestPrepDashboard(userId: string) {
    const profile = await this.studentProfileRepo.findOne({
      where: {usersId: userId},
      include: [{relation: 'gradeLevel'}],
    });

    const submissions = await this.submissionRepo.find({
      where: {usersId: userId, isDeleted: false},
      order: ['submittedAt DESC'],
      include: [{relation: 'assessment'}],
    });

    const totalTaken = submissions.length;
    const passedCount = submissions.filter(s => s.isPassed).length;
    const totalScoreSum = submissions.reduce((acc, s) => acc + (s.score || 0), 0);
    const averageScore = totalTaken > 0 ? Math.round(totalScoreSum / totalTaken) : 0;
    const accuracyRate = totalTaken > 0 ? Math.round((passedCount / totalTaken) * 100) : 0;

    const testPrepSubjects = await this.getTestPrepSubjects(profile?.gradeLevelId);

    return {
      student: {
        id: userId,
        gradeLevel: (profile as any)?.gradeLevel?.label || 'Grade 6',
        tier: (profile as any)?.gradeLevel?.category || 'junior',
        hasTestPrep: (profile as any)?.gradeLevel?.hasTestPrep ?? true,
        hasFullCurriculum: (profile as any)?.gradeLevel?.hasFullCurriculum ?? false,
      },
      stats: {
        totalPracticesCompleted: totalTaken,
        accuracyRate,
        averageScore,
        totalXpEarned: profile?.xp || 0,
        streakDays: profile?.streakDays || 0,
      },
      subjects: testPrepSubjects,
      recentActivity: submissions.slice(0, 5).map(s => ({
        submissionId: s.id,
        assessmentTitle: (s as any).assessment?.title || 'Practice Drill',
        score: s.score,
        isPassed: s.isPassed,
        xpAwarded: s.xpAwarded || 0,
        submittedAt: s.submittedAt,
      })),
    };
  }
}
