// Sentence splitting for story beats, shared by story-to-video.mjs and
// expand-story.mjs. Both need identical results: the renderer derives scene ids
// from the split, so a visual plan keyed by those ids only lines up if the
// planner splits the same way.

const terminalPunctuation = /[。！？!?；;]$/;
const narrativeTurn = /^(后来|然后|接着|突然|可是|但是|但|却|于是|直到|最后|没想到|第二天|那天|这时)/;

const hardChunk = (value, maxLength = 36) => {
  const chunks = [];
  let remaining = value.trim();

  while (remaining.length > maxLength) {
    const window = remaining.slice(0, maxLength + 1);
    let cut = Math.max(
      window.lastIndexOf('，'),
      window.lastIndexOf('、'),
      window.lastIndexOf('；'),
    );
    if (cut < Math.floor(maxLength * 0.55)) cut = maxLength;
    else cut += 1;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
};

const splitLongBeat = (sentence, softLimit = 36) => {
  const value = sentence.trim();
  if (value.length <= softLimit) return [value];

  const ending = value.match(/[。！？!?；;]$/)?.[0] || '';
  const body = ending ? value.slice(0, -1) : value;
  const clauses = body
    .split(/(?<=，|、)|(?=(?:后来|然后|接着|突然|可是|但是|但|却|于是|直到|最后|没想到|第二天|那天|这时))/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (clauses.length === 1) return hardChunk(value, softLimit);

  const beats = [];
  let current = '';
  for (const clause of clauses) {
    const candidate = `${current}${clause}`;
    const startsNewBeat = narrativeTurn.test(clause) && current.length >= 12;
    if (current && (candidate.length > softLimit || startsNewBeat)) {
      beats.push(current.replace(/[，、]$/, '。'));
      current = clause;
    } else {
      current = candidate;
    }
  }
  if (current) beats.push(`${current.replace(/[，、]$/, '')}${ending || '。'}`);
  return beats.flatMap((beat) => hardChunk(beat, softLimit));
};

export const splitStory = (text) => {
  const normalized = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  const paragraphs = normalized.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  const beats = [];

  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [];
    for (const sentence of sentences) {
      beats.push(...splitLongBeat(sentence));
    }
  }

  return beats
    .map((beat) => beat.trim())
    .filter(Boolean)
    .map((beat) => (terminalPunctuation.test(beat) ? beat : `${beat}。`));
};
