import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CatalogIdPipe } from "../../common/catalog-id.pipe.js";
import { MapResultsDto } from "./dto/map-results.dto.js";
import { VoteResultsService } from "./vote-results.service.js";

@ApiTags("votes")
@Controller("maps/:mapId/results")
export class VoteResultsController {
  constructor(private readonly service: VoteResultsService) {}

  @Get()
  @ApiOperation({
    summary: "Public community results for a map",
    description:
      "Includes historical inactive choices. Rankings: votes descending, then name and UUID ascending. Percentages use totalVotes independently for agents and weapons.",
  })
  @ApiParam({
    name: "mapId",
    format: "uuid",
    description: "Valorant GUID; RFC version bits are not required",
  })
  @ApiOkResponse({ type: MapResultsDto })
  @ApiBadRequestResponse({ description: "Malformed catalog GUID" })
  @ApiNotFoundResponse({ description: "Map not found" })
  @ApiServiceUnavailableResponse({ description: "Storage unavailable" })
  get(@Param("mapId", CatalogIdPipe) mapId: string): Promise<MapResultsDto> {
    return this.service.get(mapId);
  }
}
