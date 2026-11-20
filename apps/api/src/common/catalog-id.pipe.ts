import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
// Valorant GUIDs use the UUID storage format, but not necessarily RFC version/variant bits.
export const CATALOG_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
@Injectable()
export class CatalogIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!CATALOG_ID_PATTERN.test(value))
      throw new BadRequestException("Invalid catalog UUID");
    return value.toLowerCase();
  }
}
