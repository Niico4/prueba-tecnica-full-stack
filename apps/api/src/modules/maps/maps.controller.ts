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
import { MapDto } from "./map.dto.js";
import { MapsService } from "./maps.service.js";
@ApiTags("maps")
@ApiServiceUnavailableResponse({ description: "Catalog storage unavailable" })
@Controller("maps")
export class MapsController {
  constructor(private readonly service: MapsService) {}
  @Get()
  @ApiOkResponse({
    type: [MapDto],
    description: "Active catalog, ordered by displayName then id",
  })
  list(): Promise<MapDto[]> {
    return this.service.list();
  }
  @Get(":mapId")
  @ApiParam({
    name: "mapId",
    format: "uuid",
    description: "Valorant GUID; RFC version bits are not required",
  })
  @ApiOkResponse({
    type: MapDto,
    description: "Includes retired records with isActive=false",
  })
  @ApiBadRequestResponse({ description: "Malformed catalog UUID" })
  @ApiNotFoundResponse({ description: "Unknown catalog UUID" })
  get(@Param("mapId", CatalogIdPipe) id: string): Promise<MapDto> {
    return this.service.get(id);
  }
}
