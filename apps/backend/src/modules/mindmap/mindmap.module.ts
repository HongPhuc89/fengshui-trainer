import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MindMap } from './entities/mindmap.entity';
import { Chapter } from '../books/entities/chapter.entity';
import { MindMapService } from './mindmap.service';
import { AdminMindMapController } from './controllers/admin-mindmap.controller';
import { UserMindMapController } from './controllers/user-mindmap.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MindMap, Chapter])],
  controllers: [AdminMindMapController, UserMindMapController],
  providers: [MindMapService],
  exports: [MindMapService],
})
export class MindMapModule {}
