import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { UserProfileModule } from '../output/user-profile.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceGenerationService } from './workspace-generation.service';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [AiModule, UserProfileModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceGenerationService],
})
export class WorkspaceModule {}
