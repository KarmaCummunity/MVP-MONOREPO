import { Module } from "@nestjs/common";
import { ChallengesController } from "./controllers/challenges.controller";
import { CommunityGroupChallengesController } from "./controllers/community-group-challenges.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [ChallengesController, CommunityGroupChallengesController],
})
export class ChallengesModule {}
