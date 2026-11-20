import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { setupApp } from "./config/setup-app.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableShutdownHooks();
  await app.listen(
    app.get(ConfigService).getOrThrow<number>("PORT"),
    "0.0.0.0",
  );
}
bootstrap().catch(() => {
  console.error(
    "API startup failed. Check configuration and service availability.",
  );
  process.exitCode = 1;
});
