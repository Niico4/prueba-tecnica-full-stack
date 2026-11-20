import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { MapDto } from "./map.dto.js";
@Injectable()
export class MapsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(): Promise<MapDto[]> {
    try {
      return await this.prisma.map.findMany({
        where: { isActive: true },
        orderBy: [{ displayName: "asc" }, { id: "asc" }],
      });
    } catch {
      throw new ServiceUnavailableException("Catalog storage is unavailable");
    }
  }
  async get(id: string): Promise<MapDto> {
    let item: MapDto | null;
    try {
      item = await this.prisma.map.findUnique({ where: { id } });
    } catch {
      throw new ServiceUnavailableException("Catalog storage is unavailable");
    }
    if (!item) throw new NotFoundException("Map not found");
    return item;
  }
}
