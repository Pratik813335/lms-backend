import {injectable, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  BadgeRepository,
  EnrollmentRepository,
  LessonProgressRepository,
  StudentProfileRepository,
  UserBadgeRepository,
} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class GamificationService {
  constructor(
    @repository(BadgeRepository)
    public badgeRepo: BadgeRepository,
    @repository(UserBadgeRepository)
    public userBadgeRepo: UserBadgeRepository,
    @repository(StudentProfileRepository)
    public studentProfileRepo: StudentProfileRepository,
    @repository(LessonProgressRepository)
    public lessonProgressRepo: LessonProgressRepository,
    @repository(EnrollmentRepository)
    public enrollmentRepo: EnrollmentRepository,
  ) {}

  /**
   * Get all badges catalog
   */
  async getAllBadges() {
    return this.badgeRepo.find({
      where: {isActive: true, isDeleted: false},
      order: ['xpReward ASC'],
    });
  }

  /**
   * Evaluate and return student badges + unlock status
   */
  async getStudentBadges(userId: string) {
    const allBadges = await this.badgeRepo.find({
      where: {isActive: true, isDeleted: false},
    });

    const userBadges: any[] = await this.userBadgeRepo.find({
      where: {usersId: userId, isActive: true, isDeleted: false},
      include: ['badge'],
    });

    const unlockedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
    const profile = await this.studentProfileRepo.findOne({where: {usersId: userId}});

    // Check if any new milestone badges should be auto-unlocked
    const completedLessonsCount = await this.lessonProgressRepo.count({
      usersId: userId,
      isCompleted: true,
    });
    const streakDays = profile?.streakDays || 0;
    const currentXp = profile?.xp || 0;

    for (const badge of allBadges) {
      if (!unlockedBadgeIds.has(badge.id!)) {
        let shouldUnlock = false;

        if (badge.milestoneType === 'completed_lessons' && completedLessonsCount.count >= (badge.milestoneCount || 1)) {
          shouldUnlock = true;
        } else if (badge.milestoneType === 'streak_days' && streakDays >= (badge.milestoneCount || 1)) {
          shouldUnlock = true;
        }

        if (shouldUnlock) {
          const newUb = await this.userBadgeRepo.create({
            usersId: userId,
            badgeId: badge.id!,
            unlockedAt: new Date(),
          });
          unlockedBadgeIds.add(badge.id!);
          userBadges.push(newUb as any);
        }
      }
    }

    const unlocked = userBadges.map(ub => ({
      id: ub.badgeId,
      title: ub.badge?.title || 'Achievement',
      description: ub.badge?.description || 'Achievement Unlocked',
      icon: ub.badge?.icon || 'Star',
      category: ub.badge?.category || 'Academic',
      rarity: ub.badge?.rarity || 'common',
      unlockedAt: ub.unlockedAt,
    }));

    const locked = allBadges
      .filter(b => !unlockedBadgeIds.has(b.id!))
      .map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        icon: b.icon,
        category: b.category,
        rarity: b.rarity,
        milestoneType: b.milestoneType,
        milestoneCount: b.milestoneCount,
        xpReward: b.xpReward,
      }));

    return {
      totalXp: currentXp,
      level: profile?.level || 1,
      unlockedCount: unlocked.length,
      unlockedBadges: unlocked,
      lockedBadges: locked,
    };
  }
}
