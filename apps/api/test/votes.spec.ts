import { ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import { PrismaService } from "../src/database/prisma.service.js";
import { VoteResultsService } from "../src/modules/votes/vote-results.service.js";
import { VotesService } from "../src/modules/votes/votes.service.js";

describe("Vote storage failures", () => {
  it("returns safe 503 errors for reads and writes", async () => {
    const module = await Test.createTestingModule({
      providers: [
        VotesService,
        VoteResultsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: vi
              .fn()
              .mockRejectedValue(
                new Error("private SQL and connection details"),
              ),
          },
        },
      ],
    }).compile();
    try {
      const service = module.get(VotesService);
      for (const operation of [
        () => service.get("user", "map"),
        () => module.get(VoteResultsService).get("map"),
        () =>
          service.upsert("user", "map", {
            agentId: "agent",
            weaponId: "weapon",
          }),
      ]) {
        await expect(operation()).rejects.toBeInstanceOf(
          ServiceUnavailableException,
        );
        await expect(operation()).rejects.toThrow(
          "Vote storage is unavailable",
        );
      }
    } finally {
      await module.close();
    }
  });
});
