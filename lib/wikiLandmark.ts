// Chooses the most notable *landmark* from nearby Wikipedia articles.
// Notability is approximated by article length; only things a visitor would recognise as a
// landmark are kept (forts, temples, towers, bridges…), never neighbourhoods, stations or schools.
export type WikiCandidate = { title: string; description: string; length: number; lat: number; lon: number; dist: number; hi?: string };

const KEEP = /fort|palace|temple|mosque|masjid|church|cathedral|basilica|monument|memorial|tomb|mausoleum|maqbara|museum|gate|tower|minar|stupa|mandir|gurdwara|ghat|lake|beach|bridge|garden|stadium|statue|landmark|heritage|historic|shrine|dargah|monastery|fountain|square|opera|castle|clock|observatory|zoo|park|caves?|waterfall|dam/i;
const DROP = /\b(city|town|village|district|neighbou?rhood|suburb|locality|arrondissement|constituency|station|school|college|university|institute|hospital|company|corporation|airport|newspaper|road|street|flyover|attack|ceremony|election|census|ward|department store|library|bank|hotel|restaurant|cinema|mall|band|film|novel|battle|massacre|demolished|former|defunct|destroyed|proposed|under construction)\b/i;

export function isLandmark(c: Pick<WikiCandidate, "title" | "description">) {
  return KEEP.test(`${c.title} ${c.description}`) && !DROP.test(c.description);
}

export function pickLandmark(candidates: WikiCandidate[]): WikiCandidate | null {
  const kept = candidates.filter(isLandmark);
  if (!kept.length) return null;
  // Longer article = more notable; small bonus for being closer to the searched place.
  const score = (c: WikiCandidate) => c.length * (1.2 - Math.min(c.dist, 10_000) / 50_000);
  return kept.sort((a, b) => score(b) - score(a))[0];
}
