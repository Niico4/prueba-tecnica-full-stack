import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./config/environment.js";
import { AgentsModule } from "./modules/agents/agents.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { MapsModule } from "./modules/maps/maps.module.js";
import { VotesModule } from "./modules/votes/votes.module.js";
import { WeaponsModule } from "./modules/weapons/weapons.module.js";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../.env",
      validate: validateEnvironment,
    }),
    HealthModule,
    MapsModule,
    AgentsModule,
    WeaponsModule,
    AuthModule,
    VotesModule,
  ],
})
export class AppModule {}
