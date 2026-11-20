import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PublicUserDto } from "./dto/public-user.dto.js";
import { normalizeIdentity } from "./normalize-identity.js";

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.userSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<PublicUserDto> {
    try {
      return await this.prisma.user.create({
        data: {
          ...input,
          username: normalizeIdentity(input.username),
          email: normalizeIdentity(input.email),
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email or username already registered");
      }
      throw new ServiceUnavailableException("User storage is unavailable");
    }
  }

  async findForAuthentication(identifier: string) {
    const normalized = normalizeIdentity(identifier);
    try {
      return await this.prisma.user.findUnique({
        where: normalized.includes("@")
          ? { email: normalized }
          : { username: normalized },
        select: { ...publicUserSelect, passwordHash: true },
      });
    } catch {
      throw new ServiceUnavailableException("User storage is unavailable");
    }
  }

  async findPublicById(id: string): Promise<PublicUserDto | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
        select: publicUserSelect,
      });
    } catch {
      throw new ServiceUnavailableException("User storage is unavailable");
    }
  }
}
