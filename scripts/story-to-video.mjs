import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {splitStory} from './lib/split-story.mjs';

import {resolveStyle} from './handdrawn-style-library.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const parseArgs = (tokens) => {
  const parsed = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = tokens[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
};

const args = parseArgs(process.argv.slice(2));
if (!args.input && !args.text) {
  console.error(
    'Usage: npm run story -- --input examples/story.txt [--style STYLE] [--generate --apply --render]\n' +
      '       npm run story -- --text "第一句。第二句。" [--style 1]\n' +
      '       npm run styles',
  );
  process.exit(1);
}

const sourceText = args.input
  ? readFileSync(resolve(root, String(args.input)), 'utf8')
  : String(args.text);
const title = String(args.title || '手绘故事');
const selectedStyle = resolveStyle(root, args.style);
const styleReferencePaths = selectedStyle.references.map(
  (reference) => reference.absolute_path,
);
const textMode = String(args['text-mode'] || 'font');
const visualPlanPath = args['visual-plan']
  ? resolve(root, String(args['visual-plan']))
  : null;
const visualPlan = visualPlanPath
  ? JSON.parse(readFileSync(visualPlanPath, 'utf8'))
  : {};
const generator = String(args.generator || 'codex');
const transition = String(args.transition || 'cut');
const transitionSec = Number(args['transition-sec'] || 0.7);
const shouldGenerate = args.generate === true;
const shouldGenerateWithApi = shouldGenerate && generator === 'api';
const shouldPrepareCodex = shouldGenerate && generator === 'codex';
const shouldApply = args.apply === true;
const shouldRender = args.render === true;
const shouldForce = args.force === true;

if (!['image2', 'font'].includes(textMode)) {
  throw new Error('--text-mode must be image2 or font');
}
if (!['codex', 'api'].includes(generator)) {
  throw new Error('--generator must be codex or api');
}
if (!['cut', 'page-flip'].includes(transition)) {
  throw new Error('--transition must be cut or page-flip');
}
if (!Number.isFinite(transitionSec) || transitionSec <= 0 || transitionSec > 2) {
  throw new Error('--transition-sec must be greater than 0 and at most 2');
}
if (shouldApply && !shouldGenerateWithApi) {
  if (shouldPrepareCodex) {
    throw new Error(
      '--apply cannot run before Codex has generated the masters. Generate from codex-image-jobs.json, then run npm run import:codex -- --apply.',
    );
  }
  throw new Error('--apply requires --generate so storyboard.json never points at missing files');
}
if (shouldRender && !shouldApply) {
  throw new Error('--render requires --apply');
}
if (shouldGenerateWithApi && !process.env.OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY is missing. The plan and prompts can be created without it; real Image 2 generation requires the key.',
  );
}

const formatCaption = (text, maxCharsPerLine = 13, maxLines = 3) => {
  const lines = [];
  let remaining = text.trim();
  while (remaining) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }
    const window = remaining.slice(0, maxCharsPerLine + 1);
    let cut = Math.max(
      window.lastIndexOf('，'),
      window.lastIndexOf('、'),
      window.lastIndexOf('；'),
      window.lastIndexOf('：'),
    );
    if (cut < Math.floor(maxCharsPerLine * 0.45)) cut = maxCharsPerLine;
    else cut += 1;
    lines.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
    if (/^[。！？!?；;：:,，、]/.test(remaining)) {
      lines[lines.length - 1] += remaining[0];
      remaining = remaining.slice(1).trim();
    }
  }
  if (lines.length > maxLines) {
    throw new Error(`Caption needs ${lines.length} lines; story beat must be split before rendering`);
  }
  return lines.join('\n');
};

const durationFor = (caption) => {
  const lineCount = caption.split('\n').length;
  const characterCount = caption.replace(/\n/g, '').length;
  return Number(Math.min(6.2, Math.max(4.4, 3.8 + lineCount * 0.48 + characterCount * 0.035)).toFixed(1));
};

const styleLock = selectedStyle.prompt;
const styleFingerprint = createHash('sha256');
styleFingerprint.update(
  JSON.stringify({
    library_version: selectedStyle.library_version,
    id: selectedStyle.id,
    name_zh: selectedStyle.name_zh,
    prompt: styleLock,
    caption_prompt: selectedStyle.caption_prompt,
    color_hint: selectedStyle.color_hint,
    avoid: selectedStyle.avoid,
    references: selectedStyle.references.map(({path, role}) => ({path, role})),
  }),
);
for (const path of styleReferencePaths) {
  styleFingerprint.update(readFileSync(path));
}
const styleVersion = styleFingerprint.digest('hex').slice(0, 16);
const characterLock = String(
  args['character-lock'] ||
    '重复出现的主角须保持同一张脸、发型、年龄、服装配色和身体比例；具体人物身份以故事原文为准；不得添加原文未提及的配角、道具或文字',
);

const storyParts = splitStory(sourceText);
if (storyParts.length === 0) throw new Error('No usable story sentences found');

const safeTitle =
  title
    .normalize('NFKC')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'story';
const hashInput = [
  generator === 'codex' ? 'codex-character-sheet-v4' : 'api-v2',
  styleVersion,
  title,
  textMode,
  transition,
  transitionSec,
  characterLock,
  JSON.stringify(visualPlan),
  sourceText,
].join('\n');
const storyHash = createHash('sha256').update(hashInput).digest('hex').slice(0, 8);
const assetSet = `${safeTitle}-${storyHash}`;

const generatedRoot = generator === 'codex' ? `generated/codex/${assetSet}` : 'generated/auto';
const promptDir = resolve(root, 'prompts', generatedRoot);
const assetDir = resolve(root, 'public/assets', generatedRoot);
mkdirSync(promptDir, {recursive: true});
mkdirSync(assetDir, {recursive: true});

const projectAsset = (name) => `assets/${generatedRoot}/${name}`;
const absoluteAsset = (name) => resolve(assetDir, name);
const writePrompt = (name, value) => {
  const path = resolve(promptDir, name);
  writeFileSync(path, `${value.trim()}\n`);
  return path;
};

const imageCli = resolve(
  process.env.CODEX_HOME || resolve(homedir(), '.codex'),
  'skills/.system/imagegen/scripts/image_gen.py',
);

const runImage2 = ({images, promptFile, size, out}) => {
  if (!existsSync(imageCli)) throw new Error(`Image 2 CLI not found: ${imageCli}`);
  const operation = images.length > 0 ? 'edit' : 'generate';
  const commandArgs = [
    imageCli,
    operation,
    '--model',
    'gpt-image-2',
    ...images.flatMap((image) => ['--image', image]),
    '--prompt-file',
    promptFile,
    '--size',
    size,
    '--quality',
    'high',
    '--out',
    out,
    ...(shouldForce ? ['--force'] : []),
  ];
  execFileSync(process.env.PYTHON || 'python3', commandArgs, {
    cwd: root,
    stdio: 'inherit',
  });
};

const fixedReferenceLegend = selectedStyle.references
  .map((reference, index) => `image ${index + 1} is the ${reference.role}`)
  .join(', ');
const characterReferenceBrief = fixedReferenceLegend
  ? `Input images: ${fixedReferenceLegend}. Use them only for drawing language, proportions, texture, palette, page rhythm and final finish. Ignore every reference's people, actions, objects and text.`
  : `Input images: no fixed style image is required for this style. Follow the named style profile exactly and do not drift toward the project's default colored-pencil look.`;
const illustrationBackground = selectedStyle.is_default
  ? 'pure white digital paper'
  : 'a clean, light, style-appropriate paper or background surface';

const captionCropHeight = 342;
const captionScanHeight = 400;

const detectCaptionCropY = (masterPath) => {
  const detection = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'verbose',
      '-loop',
      '1',
      '-i',
      masterPath,
      '-vf',
      `crop=1024:${captionScanHeight}:0:0,negate,format=gray,lut=y='if(gt(val,80),255,0)',cropdetect=limit=0.1:round=2:reset=0`,
      '-frames:v',
      '3',
      '-f',
      'null',
      '-',
    ],
    {cwd: root, encoding: 'utf8'},
  );
  const log = `${detection.stdout || ''}\n${detection.stderr || ''}`;
  const matches = [...log.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  const last = matches.at(-1);
  if (detection.status !== 0 || !last) {
    console.warn(`Could not detect caption bounds for ${masterPath}; using top-aligned crop`);
    return 0;
  }

  const contentHeight = Number(last[2]);
  const contentY = Number(last[4]);
  const centeredY = Math.round(contentY + contentHeight / 2 - captionCropHeight / 2);
  return Math.max(0, Math.min(captionScanHeight - captionCropHeight, centeredY));
};

let previousColor = null;
const scenes = [];
const codexJobs = [];

let codexCharacterReference = null;
if (generator === 'codex') {
  codexCharacterReference = absoluteAsset('00_character_reference.png');
  const characterPrompt = writePrompt(
    '00_character_reference.txt',
    `Use case: illustration-story
Asset type: fixed protagonist character reference sheet for a hand-drawn Chinese story video in the "${selectedStyle.name_zh}" style
${characterReferenceBrief}
Primary request: draw ONLY the recurring protagonists described below. Show each protagonist in two simple full-body poses, front view and three-quarter view, arranged side by side.
Character lock: ${characterLock}
Style: ${styleLock}
Composition: square canvas on ${illustrationBackground}, all uncropped full-body poses centered with generous spacing and a clean 10% safe border. No scenery, furniture, extra people, props or decorative marks.
Color and material: ${selectedStyle.color_hint}
Constraints: this is an identity reference only; no text, letters, numbers, labels, captions, speech bubbles, logo, signature or watermark; ${selectedStyle.avoid}.`,
  );
  codexJobs.push({
    id: 'character_reference',
    role: 'reference',
    prompt_file: characterPrompt,
    prompt: readFileSync(characterPrompt, 'utf8').trim(),
    output_master: codexCharacterReference,
    references: styleReferencePaths,
    reference_count: styleReferencePaths.length,
  });
}

for (let index = 0; index < storyParts.length; index += 1) {
  const text = storyParts[index];
  const id = String(index + 1).padStart(2, '0');
  const textName = `${id}_text.png`;
  const bwName = `${id}_bw.png`;
  const colorName = `${id}_color.png`;
  const masterName = `${id}_master.png`;
  const caption = formatCaption(text);
  const visualDirection = String(
    visualPlan[id] || 'Stage one simple visual beat that expresses only the current sentence.',
  );
  const usesImage2Text = textMode === 'image2';
  const masterSize = usesImage2Text ? '1024x1536' : '1024x1024';
  const captionPanel = usesImage2Text
    ? `Top copy panel (pixels y=0–342): pure white background. Write ONLY this Simplified Chinese caption verbatim, preserving the explicit line breaks:
"${caption}"
${selectedStyle.caption_prompt} Use 1–3 large readable lines with generous 48-pixel left/right margins. Do not put any illustration or decorative mark in this panel. Do not place text below y=342.`
    : 'Use the entire canvas only for the illustration; do not add any text.';
  const textConstraint = usesImage2Text
    ? 'no extra text outside the exact top caption, no letters or numbers in the illustration, no labels, captions, speech bubbles, logo, signature or watermark'
    : 'no text, letters, numbers, labels, captions, speech bubbles, logo, signature or watermark';
  const illustrationPanel = usesImage2Text
    ? 'Illustration panel (pixels y=512–1536): use this exact lower 1024×1024 square for the scene. Leave the 342–512 transition band completely white.'
    : 'Use the entire 1024×1024 square for the scene.';

  const hasContinuityReference = Boolean(previousColor) || Boolean(codexCharacterReference);
  const sceneReferenceBrief = fixedReferenceLegend
    ? `Input images: ${fixedReferenceLegend}${hasContinuityReference ? '; any later image is an identity or continuity reference' : ''}. Use the fixed style images only for drawing language, texture, palette, page rhythm and finish. Ignore their depicted people, actions, objects and text.`
    : hasContinuityReference
      ? `Input images: every supplied image is an identity or continuity reference. Preserve identity and useful continuity, but follow the written "${selectedStyle.name_zh}" style profile rather than copying an earlier composition.`
      : `Input images: none. Follow the written "${selectedStyle.name_zh}" style profile exactly.`;
  const masterPrompt = writePrompt(
    `${id}_master.txt`,
    `Use case: illustration-story
Asset type: one vertical production master for a hand-drawn Chinese story video in the "${selectedStyle.name_zh}" style. This single output will be locally split into a caption plate and an illustration plate.
${sceneReferenceBrief}
Narrative sentence to illustrate: "${text}"
Scene direction: ${visualDirection}
Create one concrete, immediately readable tableau for that sentence. Use the locked recurring protagonists whenever the current sentence requires them.
Character lock: ${characterLock}
Style: ${styleLock}
${captionPanel}
${illustrationPanel}
Composition: stage one sparse, immediately readable tableau on ${illustrationBackground}. Let the subject group occupy roughly 70–82% of the illustration square while preserving abundant uncluttered negative space. Use a medium or wider view by default; a fully contained medium close-up is allowed only for a reaction beat. Reserve a clean style-appropriate safe border of at least 7% on every side. Every figure, face, hand, limb, prop, building edge, roof, tree branch, rain stroke and motion mark must stay completely inside that border. Scale the scene down when necessary; never let any visible mark touch or cross a canvas edge.
Color and material: ${selectedStyle.color_hint}
Continuity: preserve the locked character design. Use the fixed character sheet only for the protagonist's identity, never copy its pose or composition. Include only people required by the current narrative sentence.
Narrative isolation: the character lock defines identities, not an automatic cast list. Show only characters explicitly named in the current sentence or strictly required for its immediate action. Never add family bystanders. Never show a future daughter, rescued child, grandmother, father or any other supporting character before that person is introduced by the narration. Do not carry any person, prop or setting forward merely because it appeared in another scene.
Constraints: non-graphic, emotionally restrained storytelling; no blood, wounds, bruises or injury; no cropped or partially visible subject, prop or background structure; ${textConstraint}; ${selectedStyle.avoid}.`,
  );

  if (shouldGenerateWithApi) {
    runImage2({
      images: [
        ...styleReferencePaths,
        ...(previousColor ? [previousColor] : []),
      ],
      promptFile: masterPrompt,
      size: masterSize,
      out: absoluteAsset(masterName),
    });
    if (usesImage2Text) {
      const captionCropY = detectCaptionCropY(absoluteAsset(masterName));
      execFileSync(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          absoluteAsset(masterName),
          '-vf',
          `crop=1024:${captionCropHeight}:0:${captionCropY},scale=1536:512:flags=lanczos`,
          '-frames:v',
          '1',
          '-y',
          absoluteAsset(textName),
        ],
        {cwd: root, stdio: 'inherit'},
      );
    }
    execFileSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        absoluteAsset(masterName),
        '-vf',
        usesImage2Text
          ? 'crop=1024:1024:0:512,format=gray,eq=contrast=1.18:brightness=0.035,unsharp=5:5:0.55:5:5:0'
          : 'format=gray,eq=contrast=1.18:brightness=0.035,unsharp=5:5:0.55:5:5:0',
        '-frames:v',
        '1',
        '-y',
        absoluteAsset(bwName),
      ],
      {cwd: root, stdio: 'inherit'},
    );
    execFileSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        absoluteAsset(masterName),
        '-vf',
        usesImage2Text ? 'crop=1024:1024:0:512' : 'null',
        '-frames:v',
        '1',
        '-y',
        absoluteAsset(colorName),
      ],
      {cwd: root, stdio: 'inherit'},
    );
    previousColor = absoluteAsset(colorName);
  }

  if (generator === 'codex') {
    const codexSceneReferences = [
      ...styleReferencePaths,
      codexCharacterReference,
    ];
    codexJobs.push({
      id,
      role: 'scene',
      prompt_file: masterPrompt,
      prompt: readFileSync(masterPrompt, 'utf8').trim(),
      output_master: absoluteAsset(masterName),
      references: codexSceneReferences,
      reference_count: codexSceneReferences.length,
    });
  }

  scenes.push({
    id,
    duration_sec: durationFor(caption),
    text: caption,
    narration: text,
    visual: `使用“${selectedStyle.name_zh}”绘制一个单一、清楚、可画的故事场景：${text}`,
    shot: 'story_beat',
    layers: ['text', 'bw_full', 'color'],
    color_hint: selectedStyle.color_hint,
    detail_hint: null,
    assets: {
      text_image: usesImage2Text ? projectAsset(textName) : null,
      bw: projectAsset(bwName),
      detail: null,
      color: projectAsset(colorName),
    },
  });
}

const storyboard = {
  project: {
    title,
    mode: 'speed',
    images_per_scene: 1,
    derive_bw: 'local',
    enable_detail: false,
    gen_size: 1024,
    export_size: [1080, 1440],
    ratio: '3:4',
    width: 1080,
    height: 1440,
    fps: 30,
    transition,
    transition_sec: transitionSec,
    style_id: selectedStyle.id,
    style_name: selectedStyle.name_zh,
    style_library_version: selectedStyle.library_version,
    style_fingerprint: styleVersion,
    style_lock: styleLock,
    character_lock: characterLock,
    audio: {
      voiceover: 'post',
      bgm: 'optional_bed_only',
      bgm_follows_text: false,
    },
  },
  scenes,
};

const outputPath = shouldApply
  ? resolve(root, 'storyboard.json')
  : resolve(root, String(args.output || 'storyboard.generated.json'));
writeFileSync(outputPath, `${JSON.stringify(storyboard, null, 2)}\n`);

if (generator === 'codex') {
  const manifestPath = resolve(root, String(args.manifest || 'codex-image-jobs.json'));
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        version: 1,
        generator: 'codex-image2',
        style_library: selectedStyle.library_path,
        style_library_version: selectedStyle.library_version,
        style_id: selectedStyle.id,
        style_name: selectedStyle.name_zh,
        style_origin: selectedStyle.origin,
        style_profile: selectedStyle.profile_path || selectedStyle.library_path,
        style_fingerprint: styleVersion,
        style_references: styleReferencePaths,
        asset_set: assetSet,
        storyboard: outputPath,
        text_mode: textMode,
        jobs: codexJobs,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Codex Image2 jobs → ${manifestPath}`);
}

console.log(
  `Style ${selectedStyle.order}: ${selectedStyle.name_zh} (${selectedStyle.id})\n` +
    `Prepared ${scenes.length} scenes → ${outputPath}\n` +
    `Prompts → ${promptDir}\n` +
    (shouldGenerateWithApi
      ? `Image 2 API assets → ${assetDir}`
      : shouldPrepareCodex
        ? `Codex built-in Image2 queue prepared. Generate each manifest job, then import it with npm run import:codex -- --apply.`
        : `Plan-only mode. Codex Image2 is the default and does not require OPENAI_API_KEY; add --generate to prepare its job manifest.`),
);

if (shouldRender) {
  execFileSync('npm', ['run', 'render'], {cwd: root, stdio: 'inherit'});
}
