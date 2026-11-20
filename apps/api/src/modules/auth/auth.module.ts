import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          algorithm: "HS256",
          expiresIn: config.getOrThrow<number>("JWT_EXPIRES_IN_SECONDS"),
          issuer: "valorant-community-api",
          audience: "valorant-community",
        },
        verifyOptions: {
          algorithms: ["HS256"],
          issuer: "valorant-community-api",
          audience: "valorant-community",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthGuard, JwtModule, UsersModule],
})
export class AuthModule {}
