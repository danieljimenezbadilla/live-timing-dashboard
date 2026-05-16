export async function fetchEvent(eventId, signal) {
  const res = await fetch(`/api/event/${eventId}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}
