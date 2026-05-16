export async function fetchEvent(eventId, signal) {
  const res = await fetch(`/api/event/${eventId}`, { signal });
  // 202 = server is connecting to upstream WebSocket, not an error
  if (res.status === 202) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}
