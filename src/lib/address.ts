/**
 * Helpers for address management and Google Maps integration.
 */

export interface AddressParts {
  street?: string;
  number?: string;
  city?: string;
  zip?: string;
  country?: string;
  complement?: string;
}

/**
 * Builds a formatted string from address parts.
 * Example: Rua Exemplo, 123, Braga, 4700-000, Portugal
 */
export function buildFullAddress(parts: AddressParts): string {
  const components = [
    parts.street && parts.number ? `${parts.street}, ${parts.number}` : parts.street || parts.number,
    parts.complement,
    parts.city,
    parts.zip,
    parts.country,
  ].filter(Boolean);

  return components.join(', ');
}

/**
 * Generates a Google Maps search URL for a given address.
 */
export function buildGoogleMapsSearchUrl(address?: string | null): string | null {
  if (!address || address === '—') return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
