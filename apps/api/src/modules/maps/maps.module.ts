import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { MapsController } from "./maps.controller.js";
import { MapsService } from "./maps.service.js";
@Module({
  imports: [DatabaseModule],
  controllers: [MapsController],
  providers: [MapsService],
})
export class MapsModule {}
