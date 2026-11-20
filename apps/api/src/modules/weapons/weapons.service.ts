import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { WeaponDto } from "./weapon.dto.js";
@Injectable()
export class WeaponsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(): Promise<WeaponDto[]> {
    try {
      return await this.prisma.weapon.findMany({
        where: { isActive: true },
        orderBy: [{ displayName: "asc" }, { id: "asc" }],
        include: {
          damageRanges: {
            orderBy: [{ rangeStartMeters: "asc" }, { rangeEndMeters: "asc" }],
          },
        },
      });
    } catch {
      throw new ServiceUnavailableException("Catalog storage is unavailable");
    }
  }
  async get(id: string): Promise<WeaponDto> {
    let item: WeaponDto | null;
    try {
      item = await this.prisma.weapon.findUnique({
        where: { id },
        include: {
          damageRanges: {
            orderBy: [{ rangeStartMeters: "asc" }, { rangeEndMeters: "asc" }],
          },
        },
      });
    } catch {
      throw new ServiceUnavailableException("Catalog storage is unavailable");
    }
    if (!item) throw new NotFoundException("Weapon not found");
    return item;
  }
}
