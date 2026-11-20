import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CatalogIdPipe } from "../../common/catalog-id.pipe.js";
import { WeaponDto } from "./weapon.dto.js";
import { WeaponsService } from "./weapons.service.js";
@ApiTags("weapons")
@ApiServiceUnavailableResponse({ description: "Catalog storage unavailable" })
@Controller("weapons")
export class WeaponsController {
  constructor(private readonly service: WeaponsService) {}
  @Get()
  @ApiOkResponse({
    type: [WeaponDto],
    description: "Active catalog, ordered by displayName then id",
  })
  list(): Promise<WeaponDto[]> {
    return this.service.list();
  }
  @Get(":weaponId")
  @ApiParam({
    name: "weaponId",
    format: "uuid",
    description: "Valorant GUID; RFC version bits are not required",
  })
  @ApiOkResponse({
    type: WeaponDto,
    description: "Includes retired records with isActive=false",
  })
  @ApiBadRequestResponse({ description: "Malformed catalog UUID" })
  @ApiNotFoundResponse({ description: "Unknown catalog UUID" })
  get(@Param("weaponId", CatalogIdPipe) id: string): Promise<WeaponDto> {
    return this.service.get(id);
  }
}
