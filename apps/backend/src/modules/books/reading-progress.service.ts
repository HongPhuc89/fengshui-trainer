import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReadingProgress } from './entities/reading-progress.entity';

export interface UpdateProgressDto {
  currentPage?: number;
  totalPages?: number;
  scrollPosition?: number;
  readingTimeSeconds?: number;
  completed?: boolean;
}

@Injectable()
export class ReadingProgressService {
  constructor(
    @InjectRepository(ReadingProgress)
    private readonly progressRepository: Repository<ReadingProgress>,
  ) {}

  async getProgress(userId: number, chapterId: number): Promise<ReadingProgress | null> {
    return this.progressRepository.findOne({
      where: { userId, chapterId },
    });
  }

  async getAllUserProgress(userId: number): Promise<ReadingProgress[]> {
    return this.progressRepository.find({
      where: { userId },
      order: { lastReadAt: 'DESC' },
    });
  }

  async updateProgress(userId: number, chapterId: number, data: UpdateProgressDto): Promise<ReadingProgress> {
    let progress = await this.progressRepository.findOne({
      where: { userId, chapterId },
    });

    if (progress) {
      // Update existing progress
      if (data.currentPage !== undefined) {
        progress.currentPage = Math.max(progress.currentPage, data.currentPage);
      }

      if (data.totalPages !== undefined) {
        progress.totalPages = data.totalPages;
      }

      // Calculate scroll position from pages if provided
      if (data.currentPage !== undefined && data.totalPages !== undefined && data.totalPages > 0) {
        progress.scrollPosition = data.currentPage / data.totalPages;
      } else if (data.scrollPosition !== undefined) {
        progress.scrollPosition = Math.max(progress.scrollPosition, data.scrollPosition);
      }

      if (data.readingTimeSeconds !== undefined) {
        progress.readingTimeSeconds += data.readingTimeSeconds;
      }

      if (data.completed !== undefined) {
        progress.completed = data.completed;
      }

      progress.lastReadAt = new Date();
    } else {
      // Create new progress
      const scrollPos =
        data.currentPage && data.totalPages && data.totalPages > 0
          ? data.currentPage / data.totalPages
          : data.scrollPosition || 0;

      progress = this.progressRepository.create({
        userId,
        chapterId,
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 0,
        scrollPosition: scrollPos,
        readingTimeSeconds: data.readingTimeSeconds || 0,
        completed: data.completed || false,
        lastReadAt: new Date(),
      });
    }

    return this.progressRepository.save(progress);
  }

  async markAsCompleted(userId: number, chapterId: number): Promise<ReadingProgress> {
    const progress = await this.getProgress(userId, chapterId);
    const totalPages = progress?.totalPages || 0;

    return this.updateProgress(userId, chapterId, {
      currentPage: totalPages,
      scrollPosition: 1.0,
      completed: true,
    });
  }

  async deleteProgress(userId: number, chapterId: number): Promise<void> {
    await this.progressRepository.delete({ userId, chapterId });
  }
}
