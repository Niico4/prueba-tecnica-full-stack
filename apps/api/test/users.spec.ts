import { ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../src/database/prisma.service.js";
import { UsersService } from "../src/modules/users/users.service.js";

describe("User storage errors", () => {
  const create = vi.fn();
  const findUnique = vi.fn();
  let service: UsersService;
  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: { user: { create, findUnique } },
        },
      ],
    }).compile();
    service = module.get(UsersService);
  });
  it("hides unexpected create failures", async () => {
    create.mockRejectedValue(new Error("postgresql://user:secret@private/db"));
    await expect(
      service.create({
        username: "player",
        email: "player@example.com",
        passwordHash: "test-hash",
      }),
    ).rejects.toThrow("User storage is unavailable");
  });
  it("hides authentication lookup failures", async () => {
    findUnique.mockRejectedValue(new Error("private details"));
    await expect(
      service.findForAuthentication("player"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it("hides authenticated user lookup failures", async () => {
    findUnique.mockRejectedValue(new Error("private details"));
    await expect(service.findPublicById("id")).rejects.toThrow(
      "User storage is unavailable",
    );
  });
});
