/**
 * the trust graph: how "1 trusted link away" is established.
 *
 * people belong to circles. two people are adjacent if they share at
 * least one circle. run BFS from the viewer; the number of trusted
 * links is the number of PEOPLE bridging you, i.e. (bfs hops − 1):
 *
 *   share a circle directly   0 links  → "in your circle"
 *   one person bridges you     1 link   → "1 trusted link away"
 *   two people bridge you      2 links  → "2 trusted links away"
 *   further                    beyond the horizon → not shown as trusted
 *
 * bounded by a horizon so a huge graph can never make delivery
 * expensive. pure: no react, no supabase.
 */

export const TRUST_HORIZON = 2; // max trusted links shown (bfs hops = horizon + 1)

export type TrustGraph = {
  /** person id → the circle ids they belong to */
  membership: Record<string, readonly string[]>;
};

export type TrustLink = {
  /** trusted links (0 = in your circle), or null if beyond the horizon */
  distance: number | null;
  /** the viewer circle that starts the shortest path, if any */
  viaCircleId: string | null;
  /** human-readable, generated from the distance — never hand-written */
  phrase: string;
};

function neighbours(graph: TrustGraph, person: string): Set<string> {
  const mine = graph.membership[person] ?? [];
  const found = new Set<string>();
  for (const [other, circles] of Object.entries(graph.membership)) {
    if (other === person) continue;
    if (circles.some((c) => mine.includes(c))) found.add(other);
  }
  return found;
}

function phraseFor(distance: number | null): string {
  if (distance === 0) return 'in your circle';
  if (distance === 1) return '1 trusted link away';
  if (distance !== null && distance >= 2) return `${distance} trusted links away`;
  return 'not in your network';
}

function sharedCircle(graph: TrustGraph, a: string, b: string): string | null {
  const aCircles = graph.membership[a] ?? [];
  return (graph.membership[b] ?? []).find((c) => aCircles.includes(c)) ?? null;
}

/** shortest trusted path from viewer to person, within the horizon. */
export function trustLink(graph: TrustGraph, viewerId: string, personId: string): TrustLink {
  if (viewerId === personId) {
    return { distance: 0, viaCircleId: null, phrase: 'you' };
  }

  const maxHops = TRUST_HORIZON + 1;
  const visited = new Set<string>([viewerId]);
  // remember which viewer-circle each first-hop person came through
  const startCircle = new Map<string, string>();

  let frontier = neighbours(graph, viewerId);
  for (const person of frontier) {
    visited.add(person);
    const via = sharedCircle(graph, viewerId, person);
    if (via) startCircle.set(person, via);
  }
  let pathStart = new Map<string, string | null>();
  for (const person of frontier) pathStart.set(person, startCircle.get(person) ?? null);

  for (let hops = 1; hops <= maxHops; hops += 1) {
    if (frontier.has(personId)) {
      return {
        distance: hops - 1,
        viaCircleId: pathStart.get(personId) ?? null,
        phrase: phraseFor(hops - 1),
      };
    }
    const next = new Set<string>();
    const nextStart = new Map<string, string | null>();
    for (const node of frontier) {
      for (const n of neighbours(graph, node)) {
        if (!visited.has(n)) {
          visited.add(n);
          next.add(n);
          nextStart.set(n, pathStart.get(node) ?? null);
        }
      }
    }
    frontier = next;
    pathStart = nextStart;
  }

  return { distance: null, viaCircleId: null, phrase: phraseFor(null) };
}

/** how many people sit within the horizon — the private "range" number. */
export function reachSize(graph: TrustGraph, viewerId: string): number {
  const maxHops = TRUST_HORIZON + 1;
  const visited = new Set<string>([viewerId]);
  let frontier = neighbours(graph, viewerId);
  for (const id of frontier) visited.add(id);
  for (let hops = 1; hops < maxHops; hops += 1) {
    const next = new Set<string>();
    for (const node of frontier) {
      for (const n of neighbours(graph, node)) {
        if (!visited.has(n)) {
          visited.add(n);
          next.add(n);
        }
      }
    }
    frontier = next;
  }
  return visited.size - 1; // exclude the viewer
}
