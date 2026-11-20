import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { VoteResultsController } from "./vote-results.controller.js";
import { VoteResultsService } from "./vote-results.service.js";
import { VotesController } from "./votes.controller.js";
import { VotesService } from "./votes.service.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [VotesController, VoteResultsController],
  providers: [VotesService, VoteResultsService],
})
export class VotesModule {}
