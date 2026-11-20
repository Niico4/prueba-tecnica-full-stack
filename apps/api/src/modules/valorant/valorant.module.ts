import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { ValorantClient } from "./valorant.client.js";
import { ValorantSyncService } from "./valorant-sync.service.js";
@Module({
  imports: [DatabaseModule],
  providers: [ValorantClient, ValorantSyncService],
  exports: [ValorantSyncService],
})
export class ValorantModule {}
