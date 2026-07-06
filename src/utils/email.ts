export function decodeEncodedEmail(encoded: string): string {
  return atob(encoded);
}
