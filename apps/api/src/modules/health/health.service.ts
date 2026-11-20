import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { HealthDto } from "./health.dto.js";
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}
  async check(): Promise<HealthDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        database: "down",
      });
    }
    return { status: "ok", database: "up" };
  }
}
