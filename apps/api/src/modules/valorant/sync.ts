import "reflect-metadata";
import { parseArgs } from "node:util";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { CATALOG_ID_PATTERN } from "../../common/catalog-id.pipe.js";
import { validateEnvironment } from "../../config/environment.js";
import { ValorantModule } from "./valorant.module.js";
import { ValorantSyncService } from "./valorant-sync.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../.env",
      validate: validateEnvironment,
    }),
    ValorantModule,
  ],
})
class SyncModule {}
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { "retire-id": { type: "string", multiple: true } },
    strict: true,
  });
  const retireIds = values["retire-id"] ?? [];
  if (retireIds.some((id) => !CATALOG_ID_PATTERN.test(id)))
    throw new Error("Invalid retirement UUID");
  const app = await NestFactory.createApplicationContext(SyncModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    console.log(
      JSON.stringify(
        await app.get(ValorantSyncService).synchronize(retireIds),
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}
main().catch((error: unknown) => {
  // Known integration errors are safe; Prisma/driver internals must not reach the CLI output.
  const message =
    error instanceof Error &&
    /^(Valorant API|Catalog incomplete|Another catalog|Invalid retirement|Unmapped weapon|Conflicting definitions|Eligible catalogs)/.test(
      error.message,
    )
      ? error.message
      : "Catalog synchronization failed. Check configuration and database availability; no partial changes were committed.";
  console.error(message);
  process.exitCode = 1;
});
