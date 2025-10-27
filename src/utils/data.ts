export function filterToAllowedHeaders(
  data: Record<string, any[]>,
  allowedHeaders: string[],
  headerTransformations: Record<string, string>
) {
  const filtered: Record<string, any[]> = {};

  for (const [header, values] of Object.entries(data)) {
    if (allowedHeaders.includes(header)) {
      const outputHeader = headerTransformations[header] || header;
      filtered[outputHeader] = values;
    }
  }

  return filtered;
}
