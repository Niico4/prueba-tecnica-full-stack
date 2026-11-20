import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const origins = app.get(ConfigService).getOrThrow<string[]>("CORS_ORIGINS");
  app.enableCors({ origin: origins.length ? origins : false });
  const config = new DocumentBuilder()
    .setTitle("Valorant Community API")
    .setDescription("Infrastructure, authentication and Valorant catalog")
    .setVersion("0.3.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, config),
  );
}
