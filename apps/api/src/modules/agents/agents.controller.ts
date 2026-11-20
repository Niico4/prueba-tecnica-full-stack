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
import { AgentDto } from "./agent.dto.js";
import { AgentsService } from "./agents.service.js";
@ApiTags("agents")
@ApiServiceUnavailableResponse({ description: "Catalog storage unavailable" })
@Controller("agents")
export class AgentsController {
  constructor(private readonly service: AgentsService) {}
  @Get()
  @ApiOkResponse({
    type: [AgentDto],
    description: "Active catalog, ordered by displayName then id",
  })
  list(): Promise<AgentDto[]> {
    return this.service.list();
  }
  @Get(":agentId")
  @ApiParam({
    name: "agentId",
    format: "uuid",
    description: "Valorant GUID; RFC version bits are not required",
  })
  @ApiOkResponse({
    type: AgentDto,
    description: "Includes retired records with isActive=false",
  })
  @ApiBadRequestResponse({ description: "Malformed catalog UUID" })
  @ApiNotFoundResponse({ description: "Unknown catalog UUID" })
  get(@Param("agentId", CatalogIdPipe) id: string): Promise<AgentDto> {
    return this.service.get(id);
  }
}
