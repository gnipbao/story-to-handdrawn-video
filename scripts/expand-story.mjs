// Expand a one-line premise into a multi-beat Chinese story that the renderer
// can storyboard, using FAL's any-llm endpoint and the same FAL_KEY the
// illustrations use.
//
//   node scripts/expand-story.mjs --premise "一个男孩把风筝放上了天" --scenes 8 --out story.txt
//
// Writes the story text to --out and the character lock to --lock-out, so both
// can be handed to `npm run story`.
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {splitStory} from './lib/split-story.mjs';

const parseArgs = (tokens) => {
  const parsed = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) continue;
    const next = tokens[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[token.slice(2)] = next;
      index += 1;
    } else {
      parsed[token.slice(2)] = true;
    }
  }
  return parsed;
};

const args = parseArgs(process.argv.slice(2));
const premise = String(args.premise || '').trim();
if (!premise) throw new Error('--premise is required');

const scenes = Number(args.scenes || 8);
if (!Number.isInteger(scenes) || scenes < 2 || scenes > 20) {
  throw new Error('--scenes must be an integer between 2 and 20');
}

const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
if (!apiKey) throw new Error('FAL_KEY is required');

// Overridable so the chain can be exercised without spending credits.
const endpoint = process.env.FAL_ANY_LLM_URL || 'https://fal.run/fal-ai/any-llm';
const candidates = args.model
  ? [String(args.model)]
  : [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'google/gemini-pro-1.5',
    ];

// The renderer splits on 。！？；and gives every beat one illustration, so the
// story has to arrive already shaped like a shot list.
const system = `你是一位中文短篇故事作者，为无配音的手绘故事动画写分镜文案。

读者会看到：每一句话配一张手绘插画，一句一个画面。

请把用户给的一句话前提，扩写成恰好 ${scenes} 句的完整故事。硬性要求：

1. 每句话必须是一个完整句子，以「。」结尾，不使用分号、感叹号、问号。
2. 每句话不超过 30 个汉字——超过会被自动拆成两个画面，破坏节奏。
3. 每句话都要能被单独画出来：写具体的人、动作、地点、物件，不要写抽象心理活动。
4. 全篇必须构成起承转合：开场交代人物与处境，中段推进，要有一个转折，结尾收束。
5. 用简体中文。不要引号对白、不要旁白腔、不要标题。
6. 不写血腥、伤口、医疗处置或任何未成年人受伤的画面。

同时给出角色锁定（character_lock）：用一段话固定所有反复出现的角色，写明各自的年龄、脸型、发型、服装颜色与身体比例。这段文字会被送进每一张插画的提示词，用来保证同一个人在所有画面里长得一样。只描述外观，不要写剧情。

再给出镜头设计（shots），与 story 一一对应、长度相同，每格一句英文，说明这一格怎么取景。规则：

1. 只用这四种景别：wide establishing shot、full shot、medium shot、medium close-up。
2. medium close-up 只能用在情绪反应的那一两格，其余用中景或更远。不要 extreme close-up，也不要要求裁切人物。
3. 不要连续两格用同一种景别——景别变化是这支片子唯一的节奏来源。
4. 除景别外，说明视角（eye level / low angle / high angle）与画面重心放什么。
5. 每句不超过 25 个英文单词，只写怎么拍，不要重复剧情，不要提颜色或画材。

只输出 JSON，不要任何其他文字：
{"title": "四到八字的标题", "character_lock": "...", "story": ["第一句。", "第二句。"], "shots": ["Wide establishing shot, eye level, ...", "Medium shot, low angle, ..."]}`;

const parseJson = (text) => {
  const cleaned = String(text || '')
    .replace(/^\s*```(?:json)?/m, '')
    .replace(/```\s*$/m, '')
    .trim();
  const candidatesJson = [cleaned];
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) candidatesJson.push(cleaned.slice(start, end + 1));
  for (const candidate of candidatesJson) {
    try {
      const data = JSON.parse(candidate);
      if (data && Array.isArray(data.story) && data.story.length > 0) return data;
    } catch {
      // try the next shape
    }
  }
  return null;
};

let result = null;
let usedModel = null;
for (const model of candidates) {
  console.log(`→ Expanding premise (${endpoint} / ${model})`);
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({model, prompt: premise, system_prompt: system}),
    });
  } catch (error) {
    console.log(`   request failed: ${error.message}`);
    continue;
  }
  if (!response.ok) {
    console.log(`   HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    continue;
  }
  const body = await response.json();
  const parsed = parseJson(body.output ?? body.text ?? body.response ?? '');
  if (parsed) {
    result = parsed;
    usedModel = model;
    break;
  }
  console.log('   response was not the expected JSON, trying the next model');
}

if (!result) {
  throw new Error(
    'Story expansion failed on every candidate model. Pass --model to pick one explicitly.',
  );
}

// The renderer will split anything longer anyway; warn rather than fail, so a
// good-enough story still gets through.
const overLong = result.story.filter((line) => line.replace(/[^\p{Letter}]/gu, '').length > 30);
if (overLong.length > 0) {
  console.log(`⚠️  ${overLong.length} sentence(s) exceed 30 characters and will be split further.`);
}
if (result.story.length !== scenes) {
  console.log(`⚠️  Asked for ${scenes} sentences, got ${result.story.length}.`);
}

const storyPath = resolve(String(args.out || 'story.generated.txt'));
const lockPath = resolve(String(args['lock-out'] || 'character-lock.generated.txt'));
const planPath = resolve(String(args['plan-out'] || 'visual-plan.generated.json'));
writeFileSync(storyPath, `${result.story.join('\n')}\n`);
writeFileSync(lockPath, `${String(result.character_lock || '').trim()}\n`);

// The renderer numbers scenes from the *split* story, and a sentence over 36
// characters becomes two beats. Split here with the same function so the plan's
// keys land on the scenes they were written for; when a sentence does split,
// both halves inherit its shot.
const shots = Array.isArray(result.shots) ? result.shots : [];
const visualPlan = {};
let beatIndex = 0;
for (const [sentenceIndex, sentence] of result.story.entries()) {
  const beats = splitStory(sentence);
  const shot = String(shots[sentenceIndex] || '').trim();
  for (let offset = 0; offset < beats.length; offset += 1) {
    beatIndex += 1;
    if (shot) visualPlan[String(beatIndex).padStart(2, '0')] = shot;
  }
  if (beats.length > 1) {
    console.log(`⚠️  Sentence ${sentenceIndex + 1} splits into ${beats.length} beats; each reuses its shot.`);
  }
}
writeFileSync(planPath, `${JSON.stringify(visualPlan, null, 2)}\n`);

if (shots.length !== result.story.length) {
  console.log(`⚠️  ${shots.length} shot directions for ${result.story.length} sentences; the rest fall back to the default framing.`);
}

console.log(
  `Model: ${usedModel}\n` +
    `Title: ${result.title || '(none)'}\n` +
    `Story (${result.story.length} sentences → ${beatIndex} beats) → ${storyPath}\n` +
    `Character lock → ${lockPath}\n` +
    `Visual plan (${Object.keys(visualPlan).length} beats) → ${planPath}`,
);
