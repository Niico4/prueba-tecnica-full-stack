// Valorant formatting markers are presentation hints, never HTML to render.
export function cleanDescription(value: string): string {
  return value.replace(/<\/?(?:whitebold|debuffred|debuff|teal)>|<\/>/gi, "");
}
