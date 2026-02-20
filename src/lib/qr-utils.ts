const QR_PREFIX = 'autoseater:guest:';

export function encodeGuestQR(guestId: string): string {
  return `${QR_PREFIX}${guestId}`;
}

export function decodeGuestQR(raw: string): string | null {
  if (!raw.startsWith(QR_PREFIX)) return null;
  const id = raw.slice(QR_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function encodeSeatingText(
  name: string,
  tableLabel: string | null,
  seatIndex: number | null
): string {
  if (!tableLabel) {
    return `Welcome, ${name}! Your seating will be assigned shortly.`;
  }
  if (seatIndex != null) {
    return `Welcome, ${name}! Your seat: ${tableLabel}, Seat ${seatIndex + 1}`;
  }
  return `Welcome, ${name}! Your table: ${tableLabel}`;
}
