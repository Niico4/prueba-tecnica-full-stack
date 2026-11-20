import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { AgentDto } from "./agent.dto.js";
@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(): Promise<AgentDto[]> {
    try {
      return await this.prisma.agent.findMany({
        where: { isActive: true },
        orderBy: [{ displayName: "asc" }, { id: "asc" }],
        include: { role: true, abilities: { orderBy: { slot: "asc" } } },
      });
    } catch {
      throw new ServiceUnavailableException("Catalog storage is unavailable");
    }
  }
  async get(id: string): Promise<AgentDto> {
    let item: AgentDto | null;
    try {
      item = await this.prisma.agent.findUnique({
        where: { id },
        include: { role: true, abilities: { orderBy: { slot: "asc" } } },
      });
    } catch {
      throw new ServiceUnavailableException("Catalog storage is unavailable");
    }
    if (!item) throw new NotFoundException("Agent not found");
    return item;
  }
}
