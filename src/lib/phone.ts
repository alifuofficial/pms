/**
 * Normalizes Ethiopian phone numbers to a consistent 2519XXXXXXXX format.
 * - Removes spaces
 * - Converts 09... to 2519...
 * - Converts +251... to 251...
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone;
  let normalized = phone.replace(/\s+/g, ""); // Remove spaces
  
  if (normalized.startsWith("+251")) {
    normalized = normalized.substring(1); // Remove +
  } else if (normalized.startsWith("09") || normalized.startsWith("07")) {
    normalized = "251" + normalized.substring(1); // Replace leading 0 with 251
  }
  
  return normalized;
}
