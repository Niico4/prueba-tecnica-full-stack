import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { WeaponsController } from "./weapons.controller.js";
import { WeaponsService } from "./weapons.service.js";
@Module({
  imports: [DatabaseModule],
  controllers: [WeaponsController],
  providers: [WeaponsService],
})
export class WeaponsModule {}
