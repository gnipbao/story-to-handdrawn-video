# story-to-handdrawn-video

[中文](#中文) | [English](#english)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 中文

把中文故事文案或一组有序的手绘图片,转换成 3:4 竖屏**手绘故事动画**。内置 20 种可切换风格,包含彩铅日记、儿童蜡笔、极简线条、水墨、水彩、水粉绘本、Zine 拼贴、白板讲解与木刻社论等视觉家族;未指定时继续使用已确认并锁定的「彩铅日记漫画」默认风格。支持手写体字幕、从左到右的「文字 → 黑白画稿 → 彩色插画」揭示、可选右下角卷页翻书转场和安全不裁剪构图。基于 [Remotion](https://www.remotion.dev/),默认输出无配音、无音乐的 H.264 画面轨,方便后期配音。

本仓库包含两部分:

- **渲染器项目**(根目录):Remotion 工程,负责实际的分镜、动效和渲染。
- **Codex / Agent Skill**(`skill-package/`):可分发的 Skill,装进 Codex 等 Agent 后用自然语言驱动渲染器,无需手动跑脚本。

### 功能特性

- 中文故事自动分句和动态分镜,保留原文措辞
- 上传漫画页或完整图片,保持原顺序和构图
- 自动拆分上方文字区与下方插画区
- 本地生成与彩色插画对齐的黑白层
- `文字 → 黑白画稿 → 彩色插画` 从左到右揭示
- 可选右下角卷页翻书转场(纸背保留淡化的原页纹理)
- 1080×1440 正式渲染和 720×960 快速预览
- Codex Image2 工作流,以及显式选择的 OpenAI API 工作流
- 20 种内置手绘风格,支持编号、英文 id、中文名和别名选择
- 每种风格附带固定示例图,并提供统一场景的风格总览

### 环境要求

- Node.js 20 或更高版本
- Python 3.10 或更高版本
- FFmpeg,且 `ffmpeg`、`ffprobe` 可从终端调用
- npm
- Google Chrome,或由 Remotion 管理的兼容浏览器
- 支持 Skill 的 Agent 运行时(Codex、Claude Code、Kimi Code 等)

### 安装

1. 准备渲染器项目:

```bash
git clone https://github.com/gnipbao/story-to-handdrawn-video.git
cd story-to-handdrawn-video
npm ci
npm run check      # TypeScript 检查 + 分镜结构校验,不访问网络
```

2. 把 Skill 装进 Agent 的 skills 目录:

```bash
# Codex
cp -R skill-package/story-to-handdrawn-video ~/.codex/skills/

# Claude Code / 通用 Agent
cp -R skill-package/story-to-handdrawn-video ~/.claude/skills/

# Kimi Code
cp -R skill-package/story-to-handdrawn-video ~/.agents/skills/
```

3. 告诉 Skill 渲染器项目在哪里(在渲染器项目目录内运行 Agent 时可省略):

```bash
export STORY_VIDEO_PROJECT=/absolute/path/to/story-to-handdrawn-video
```

### 使用方法(Codex Skill 示例)

装好 Skill 后,全部通过自然语言驱动,分句、分镜、图片生成、导入、渲染由 Agent 按 Skill 约定自动完成。

**故事文本 → 手绘动画**(Skill 的默认提示词):

```text
使用 $story-to-handdrawn-video 把这段故事生成可后期配音的手绘动画。

<在这里粘贴故事文本>
```

也可以把故事放在 UTF-8 文本文件里:

```text
使用 $story-to-handdrawn-video 把 /absolute/story.txt 生成手绘动画,标题叫「纸上的夏天」。
```

**上传图片 → 手绘动画**(图片按播放顺序给出):

```text
使用 $story-to-handdrawn-video 把这几张图片按顺序生成手绘动画:
/absolute/01.jpg /absolute/02.jpg /absolute/03.jpg
```

**翻书效果**(保留原始页面,从右下角卷页):

```text
使用 $story-to-handdrawn-video 把这些图片做成翻书效果的手绘动画:
/absolute/01.jpg /absolute/02.jpg
```

**先出预览**(720×960,确认效果后再出正式版):

```text
使用 $story-to-handdrawn-video 先给这个故事生成一个预览版。
```

使用建议:

- 故事文本默认一个完整句子一个节拍;想控制节奏,直接在故事里按句分行即可。
- 遇到时间跳跃、指代不明、医疗场景或年龄敏感角色时,建议先让 Agent 给出视觉规划(两位场景编号为键的 JSON),确认后再生成。
- 默认使用 Codex Image2 生成图片;只有明确要求时才会走 OpenAI API(需 `OPENAI_API_KEY`)。
- 输出是静音画面轨,配音和 BGM 属于后期工作。

### 20 种内置手绘风格

所有示例使用同一组人物、动作和构图生成,便于直接比较画材、线条、色板与完成度。示例图只作为**风格证据**,生成故事时仍由原文和角色锁定控制人物、场景与动作。

![20 种手绘风格总览](references/style-examples/handdrawn-style-library-contact-sheet.jpg)

| # | 示例 | Style id | 中文名 | 视觉特征 | 推荐题材 |
|---:|:---:|---|---|---|---|
| 1 | <a href="references/style-examples/01-colored-pencil-diary.png"><img src="references/style-examples/01-colored-pencil-diary.png" width="120" alt="彩铅日记漫画示例"></a> | `colored-pencil-diary` | 彩铅日记漫画（默认） | 笨拙黑色毡尖笔轮廓、低饱和彩铅乱涂、大留白 | 家庭、生活、纪实情感 |
| 2 | <a href="references/style-examples/02-minimal-line-explainer.png"><img src="references/style-examples/02-minimal-line-explainer.png" width="120" alt="极简黑白线条讲解示例"></a> | `minimal-line-explainer` | 极简黑白线条讲解 | 米白纸、细黑单线、火柴人与极少道具 | 科普、流程、观点 |
| 3 | <a href="references/style-examples/03-kid-crayon.png"><img src="references/style-examples/03-kid-crayon.png" width="120" alt="五岁儿童蜡笔坏画示例"></a> | `kid-crayon` | 五岁儿童蜡笔坏画 | 歪扭比例、线条不闭合、明亮蜡笔涂出边界 | 童年、亲子、轻喜剧 |
| 4 | <a href="references/style-examples/04-rawkid-crayon.png"><img src="references/style-examples/04-rawkid-crayon.png" width="120" alt="潦草家庭投稿蜡笔示例"></a> | `rawkid-crayon` | 潦草家庭投稿蜡笔 | 家长歪线稿、孩子粗乱上色、大片露白 | 家庭连载、温暖日常 |
| 5 | <a href="references/style-examples/05-bean-doodle-infographic.png"><img src="references/style-examples/05-bean-doodle-infographic.png" width="120" alt="小豆人涂鸦信息图示例"></a> | `bean-doodle-infographic` | 小豆人涂鸦信息图 | 黑色圆豆人、白点眼、单一橙色强调 | 步骤、清单、知识卡 |
| 6 | <a href="references/style-examples/06-ms-paint-bad-doodle.png"><img src="references/style-examples/06-ms-paint-bad-doodle.png" width="120" alt="鼠标烂涂鸦示例"></a> | `ms-paint-bad-doodle` | 鼠标烂涂鸦 | 锯齿鼠标线、荒谬比例、粗糙纯色块 | 吐槽、反转、荒诞 |
| 7 | <a href="references/style-examples/07-ballpoint-scribble.png"><img src="references/style-examples/07-ballpoint-scribble.png" width="120" alt="圆珠笔缠绕线速写示例"></a> | `ballpoint-scribble` | 圆珠笔缠绕线速写 | 单色圆珠笔缠绕线、疏密塑形、现场手稿感 | 肖像、动物、独白 |
| 8 | <a href="references/style-examples/08-real-crayon-paper.png"><img src="references/style-examples/08-real-crayon-paper.png" width="120" alt="真实蜡笔纸实拍示例"></a> | `real-crayon-paper` | 真实蜡笔纸实拍 | 可见纸纹、蜡质结块、压力变化与大量漏白 | 儿童视角、成长记录 |
| 9 | <a href="references/style-examples/09-ink-wash.png"><img src="references/style-examples/09-ink-wash.png" width="120" alt="水墨写意示例"></a> | `ink-wash` | 水墨写意 | 宣纸、浓淡干湿、飞白枯笔与朱红点睛 | 文化、寓言、感悟 |
| 10 | <a href="references/style-examples/10-emotional-watercolor-sketch.png"><img src="references/style-examples/10-emotional-watercolor-sketch.png" width="120" alt="情绪叙事淡彩速写示例"></a> | `emotional-watercolor-sketch` | 情绪叙事淡彩速写 | 靛蓝松散速写、透明淡彩、单一暖橙焦点 | 回忆、关系、克制纪实 |
| 11 | <a href="references/style-examples/11-retro-gouache-concept.png"><img src="references/style-examples/11-retro-gouache-concept.png" width="120" alt="中古动画水粉概念稿示例"></a> | `retro-gouache-concept` | 中古动画水粉概念稿 | 奶油纸、水粉大形、橙蓝互补、干刷边缘 | 怀旧、城市、温暖剧情 |
| 12 | <a href="references/style-examples/12-sunlit-storybook.png"><img src="references/style-examples/12-sunlit-storybook.png" width="120" alt="暖光童画绘本示例"></a> | `sunlit-storybook` | 暖光童画绘本 | 柔软水粉、暖边光、蓬松形状与未完成感 | 治愈、童话、亲情 |
| 13 | <a href="references/style-examples/13-nordic-gouache-storybook.png"><img src="references/style-examples/13-nordic-gouache-storybook.png" width="120" alt="北欧低饱和水粉绘本示例"></a> | `nordic-gouache-storybook` | 北欧低饱和水粉绘本 | 丹宁蓝与芥末黄、哑光颗粒、安静留白 | 日常、自然、睡前故事 |
| 14 | <a href="references/style-examples/14-inked-storybook.png"><img src="references/style-examples/14-inked-storybook.png" width="120" alt="墨线淡彩绘本示例"></a> | `inked-storybook` | 墨线淡彩绘本 | 清晰墨线、轻薄水彩、角色表演突出 | 角色、青春、对白 |
| 15 | <a href="references/style-examples/15-warm-flat-storybook.png"><img src="references/style-examples/15-warm-flat-storybook.png" width="120" alt="暖色几何扁平绘本示例"></a> | `warm-flat-storybook` | 暖色几何扁平绘本 | 简化几何块面、暖色平涂、清楚视觉层级 | 关系、品牌、轻科普 |
| 16 | <a href="references/style-examples/16-naive-marker-notes.png"><img src="references/style-examples/16-naive-marker-notes.png" width="120" alt="稚拙马克笔笔记示例"></a> | `naive-marker-notes` | 稚拙马克笔笔记 | 粗黑马克笔、荧光重点与随手批注感 | 社媒、观点、年轻化内容 |
| 17 | <a href="references/style-examples/17-zine-riso-collage.png"><img src="references/style-examples/17-zine-riso-collage.png" width="120" alt="Zine 孔版拼贴示例"></a> | `zine-riso-collage` | Zine 孔版拼贴 | 复印颗粒、撕纸拼贴、有限孔版套色 | 成长、旅行、音乐文化 |
| 18 | <a href="references/style-examples/18-organic-contour-doodle.png"><img src="references/style-examples/18-organic-contour-doodle.png" width="120" alt="有机轮廓品牌涂鸦示例"></a> | `organic-contour-doodle` | 有机轮廓品牌涂鸦 | 松弛轮廓、温暖点色、生活方式插画感 | 餐饮、生活方式、品牌故事 |
| 19 | <a href="references/style-examples/19-whiteboard-explainer.png"><img src="references/style-examples/19-whiteboard-explainer.png" width="120" alt="白板讲解动画示例"></a> | `whiteboard-explainer` | 白板讲解动画 | 白底黑线、少量红蓝标记、步骤清晰 | 教程、商业解释、时间线 |
| 20 | <a href="references/style-examples/20-linocut-editorial.png"><img src="references/style-examples/20-linocut-editorial.png" width="120" alt="粗粝木刻社论插画示例"></a> | `linocut-editorial` | 粗粝木刻社论插画 | 高反差刻痕、套色偏移、纸张颗粒 | 社会议题、历史、寓言 |

查看完整菜单和每张示例图路径:

```bash
python3 scripts/run_story_video.py --list-styles
```

选择风格时可使用编号、id、中文名或别名:

```text
使用 $story-to-handdrawn-video 选择「水墨写意」风格,把这段故事生成静音手绘动画。
```

```bash
python3 scripts/run_story_video.py \
  --input examples/story.txt \
  --title "纸上的夏天" \
  --style ink-wash \
  --mode plan
```

机器可读配方位于 [references/handdrawn-style-library.json](references/handdrawn-style-library.json)。其中 `contact_sheet` 指向总览图,每种风格的 `example_image` 指向对应示例;来源于 [hand-drawn-styles](https://github.com/threerocks/hand-drawn-styles) 的配方保留 MIT 署名,详见 [references/handdrawn-styles-LICENSE.txt](references/handdrawn-styles-LICENSE.txt)。

### 输出契约

| 输入 | 模式 | 输出路径 |
| --- | --- | --- |
| 故事文本 | 正式 | `out/picture_silent.mp4` |
| 故事文本 | 预览 | `out/picture_silent-preview.mp4` |
| 上传图片 | 正式 | `out/uploaded_picture_silent.mp4` |
| 上传图片 | 预览 | `out/uploaded_picture_silent-preview.mp4` |

- 分辨率:正式 1080×1440,预览 720×960
- 编码:H.264,静音

Skill 的完整行为约定见 [skill-package/story-to-handdrawn-video/SKILL.md](skill-package/story-to-handdrawn-video/SKILL.md)。

### 在 GitHub Actions 上运行

仓库内置两个工作流（`.github/workflows/`）：

| 工作流 | 触发方式 | 作用 |
| --- | --- | --- |
| `check.yml` | push / PR / 手动 | TypeScript 检查，并用临时生成的图片跑一遍导入 + 分镜校验 |
| `render-uploaded.yml` | 手动（workflow_dispatch） | 把 `inputs/` 目录里的有序图片渲染成视频，产物作为 artifact 下载 |
| `render-story.yml` | 手动（workflow_dispatch） | **一句话（或故事文本）→ 出图 → 视频**，扩写与出图都交给 FAL AI（需 `FAL_KEY` secret）|

渲染流程：把按顺序命名的图片（`01.png`、`02.png`…）提交到 `inputs/`，然后在 **Actions → render-uploaded → Run workflow** 里选择标题、转场（`cut` / `page-flip`）、布局、每页时长和画质（`preview` / `final`），运行结束后从 artifact 下载 `out/*.mp4`。

几点限制：

- **一句话变成故事，靠 `scripts/expand-story.mjs`。** 渲染器按「。！？；」切句，一句一个画面，所以只给一句话就只有一格。这个脚本把一句前提送进 FAL 的 `fal-ai/any-llm`（跟出图同一把 `FAL_KEY`），要求模型回一份已经排成分镜的故事：恰好 N 句、每句不超过 30 字、每句都能单独画出来、整体起承转合，同时给出一段角色锁定描述。角色锁定会随每张插画的提示词一起送出去，是同一个人在所有画面里长得一样的关键——没有它渲染器只会用一句很泛的默认描述，脸会飘。在 `render-story.yml` 里填 `premise` 就走这条路，留空则用 `story_file`。
- **镜头设计也在同一次扩写里出。** 渲染器切完句只会给每格套同一句默认取景，所以八格会是同一个距离看同一个人。扩写时会一并要求模型给出与句子一一对应的 `shots`：只许用 wide / full / medium / medium close-up 四种景别，medium close-up 只留给情绪反应那一两格，且不许连续两格同景别——景别变化是这支片子唯一的节奏来源。结果写成 `visual-plan.generated.json`，经 `--visual-plan` 送进每格的 `Scene direction:`。
- **分镜键要对齐，所以切句逻辑抽成了 `scripts/lib/split-story.mjs`。** 场景编号是按**切分后**的节拍算的，一句超过 36 字会被拆成两格，后面所有编号跟着位移。扩写脚本用同一个 `splitStory` 预先算出真实编号再写键，句子被拆开时两格沿用同一个镜头。两边共用一份实现，避免规则各自漂移。
- **出图这步由 `tools/fal-imagegen/` 补上。** 本仓库本身不含图像生成器：`scripts/story-to-video.mjs` 的 `runImage2()` 把提示词文件和参考图交给 `$CODEX_HOME/skills/.system/imagegen/scripts/image_gen.py`，那个 CLI 属于 Codex，不在仓库里。`tools/fal-imagegen/` 用同样的接口重新实现了它，底层调 [delphichi/2025TRIP](https://github.com/delphichi/2025TRIP) 的 `fal_image.py`（FAL AI 的 `gpt-image-2`）。`render-story.yml` 只是把 `CODEX_HOME` 指过去，渲染器一行代码都不用改。需要在 Settings → Secrets 里加 `FAL_KEY`。
- **默认的 `--generator codex` 仍然需要人。** 它不出图，只写出 `codex-image-jobs.json` 交给 agent 逐条完成，要在 CI 上跑得在 workflow 里真的跑一个 agent。`render-story.yml` 走的是 `--generator api` 这条路。
- **不要直接在 CI 上跑 `npm run check`。** `check:storyboard` 会校验分镜引用的 PNG 是否存在，而 `public/assets/generated/` 在 `.gitignore` 里；干净检出时必然失败。工作流因此拆成 `check:types` + 针对现场生成的分镜做校验。
- **`package-lock.json` 里的 231 个依赖都指向 `registry.npmmirror.com`。** 工作流用 `npm ci --registry=https://registry.npmjs.org --replace-registry-host=always` 改写主机名，避免从 GitHub runner 访问镜像源。
- **需要 Chrome Headless Shell。** runner 预装的 Chrome 已移除旧版 headless 模式，Remotion 会启动失败，所以工作流里先执行 `npx remotion browser ensure`（约 150MB，从 `remotion.media` 下载；若组织限制出网需放行该域名）。
- ffmpeg 与 ffprobe 都是必需的，工作流会在缺失时用 apt 安装。

### 项目结构

```text
.
├── src/                    # Remotion 组件(场景、擦除动效、翻页、缓动)
├── scripts/                # 渲染器入口与导入/校验/打包脚本(由 Skill 调用)
├── skill-package/          # 可分发的 Codex / Agent Skill
├── examples/               # 示例故事文本
├── references/             # 20 风格配方、默认风格参考板与示例图库
├── public/                 # 字体与素材(generated/ 为运行时产物)
├── storyboard.json         # 默认文本故事分镜示例
├── storyboard.uploaded.json # 上传图片分镜示例
└── DESIGN.md               # 设计说明
```

渲染器项目的维护命令:`npm run dev`(Remotion Studio)、`npm run check`(类型与分镜校验)、`npm run build`(生产构建)、`npm run package:share`(生成源码分享包)。

### 字体

项目使用随附的站酷马善政毛笔字体(Ma Shan Zheng),许可证见 [public/fonts/OFL-MaShanZheng.txt](public/fonts/OFL-MaShanZheng.txt)(SIL Open Font License)。

### 贡献

欢迎贡献——请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。注意 `skill-package/` 下的 Skill 契约与 `src/`、`scripts/` 下的渲染器逻辑是核心部分,修改需要充分理由。

### 开源协议

[MIT](LICENSE)

---

## English

Convert Chinese story copy — or ordered hand-drawn images — into a 3:4 vertical **hand-drawn story animation**. The project includes 20 selectable visual families spanning colored pencil, kid crayon, minimal line art, ink wash, watercolor, gouache storybooks, zine collage, whiteboard explainers, and linocut editorial illustration. When no style is requested, it preserves the approved and locked colored-pencil diary default. Built on [Remotion](https://www.remotion.dev/); outputs a silent H.264 picture track ready for post-production voiceover.

This repo contains:

- **The renderer project** (root): the Remotion app that storyboards, animates, and renders.
- **A Codex / agent skill** (`skill-package/`): a distributable skill that drives the renderer with natural language — no scripts to run by hand.

### Requirements

- Node.js 20+, Python 3.10+, npm
- FFmpeg (`ffmpeg` and `ffprobe` on PATH)
- Google Chrome or a Remotion-managed compatible browser
- An agent runtime with skill support (Codex, Claude Code, Kimi Code, …)

### Install

1. Set up the renderer project:

```bash
git clone https://github.com/gnipbao/story-to-handdrawn-video.git
cd story-to-handdrawn-video
npm ci
npm run check
```

2. Install the skill into your agent's skills directory:

```bash
# Codex
cp -R skill-package/story-to-handdrawn-video ~/.codex/skills/

# Claude Code / generic agents
cp -R skill-package/story-to-handdrawn-video ~/.claude/skills/

# Kimi Code
cp -R skill-package/story-to-handdrawn-video ~/.agents/skills/
```

3. Point the skill at the renderer project (skip when the agent runs inside it):

```bash
export STORY_VIDEO_PROJECT=/absolute/path/to/story-to-handdrawn-video
```

### Usage (Codex skill examples)

Everything is driven in natural language; sentence splitting, storyboarding, image generation, import, and rendering are handled by the agent per the skill contract.

Story text → animation (the skill's default prompt):

```text
使用 $story-to-handdrawn-video 把这段故事生成可后期配音的手绘动画。

<paste your story here>
```

Ordered images → animation:

```text
使用 $story-to-handdrawn-video 把这几张图片按顺序生成手绘动画:
/absolute/01.jpg /absolute/02.jpg /absolute/03.jpg
```

Page-flip effect (uploaded pages shown untouched, curled from the bottom-right corner):

```text
使用 $story-to-handdrawn-video 把这些图片做成翻书效果的手绘动画:
/absolute/01.jpg /absolute/02.jpg
```

Preview first (720×960, before committing to a full render):

```text
使用 $story-to-handdrawn-video 先给这个故事生成一个预览版。
```

Notes: one complete sentence per beat by default; Codex Image2 is the default image generator (the OpenAI API path is only used when explicitly requested and requires `OPENAI_API_KEY`); output is a silent picture track — voiceover and BGM are post-production.

### Built-in style library

The samples below use the same characters, action, and composition so line work, material, palette, and finish can be compared directly. Samples are style evidence only; story text and the character lock still control scene content and identity.

![20-style hand-drawn library](references/style-examples/handdrawn-style-library-contact-sheet.jpg)

| # | Sample | Style id | English name | Best fit |
|---:|:---:|---|---|---|
| 1 | <a href="references/style-examples/01-colored-pencil-diary.png"><img src="references/style-examples/01-colored-pencil-diary.png" width="120" alt="Colored-pencil diary comic sample"></a> | `colored-pencil-diary` | Colored-pencil diary comic (default) | family, everyday life, documentary emotion |
| 2 | <a href="references/style-examples/02-minimal-line-explainer.png"><img src="references/style-examples/02-minimal-line-explainer.png" width="120" alt="Minimal line explainer sample"></a> | `minimal-line-explainer` | Minimal line explainer | education, process, ideas |
| 3 | <a href="references/style-examples/03-kid-crayon.png"><img src="references/style-examples/03-kid-crayon.png" width="120" alt="Kid crayon bad drawing sample"></a> | `kid-crayon` | Kid crayon bad drawing | childhood, parenting, light comedy |
| 4 | <a href="references/style-examples/04-rawkid-crayon.png"><img src="references/style-examples/04-rawkid-crayon.png" width="120" alt="Raw family crayon card sample"></a> | `rawkid-crayon` | Raw family crayon card | family serials, warm daily moments |
| 5 | <a href="references/style-examples/05-bean-doodle-infographic.png"><img src="references/style-examples/05-bean-doodle-infographic.png" width="120" alt="Bean doodle infographic sample"></a> | `bean-doodle-infographic` | Bean doodle infographic | steps, lists, knowledge cards |
| 6 | <a href="references/style-examples/06-ms-paint-bad-doodle.png"><img src="references/style-examples/06-ms-paint-bad-doodle.png" width="120" alt="MS Paint bad doodle sample"></a> | `ms-paint-bad-doodle` | MS Paint bad doodle | satire, reversal, absurdity |
| 7 | <a href="references/style-examples/07-ballpoint-scribble.png"><img src="references/style-examples/07-ballpoint-scribble.png" width="120" alt="Ballpoint scribble sketch sample"></a> | `ballpoint-scribble` | Ballpoint scribble sketch | portraits, animals, monologue |
| 8 | <a href="references/style-examples/08-real-crayon-paper.png"><img src="references/style-examples/08-real-crayon-paper.png" width="120" alt="Real crayon paper sample"></a> | `real-crayon-paper` | Real crayon paper | child viewpoint, growth records |
| 9 | <a href="references/style-examples/09-ink-wash.png"><img src="references/style-examples/09-ink-wash.png" width="120" alt="Expressive ink wash sample"></a> | `ink-wash` | Expressive ink wash | culture, fables, reflection |
| 10 | <a href="references/style-examples/10-emotional-watercolor-sketch.png"><img src="references/style-examples/10-emotional-watercolor-sketch.png" width="120" alt="Emotional light-watercolor sketch sample"></a> | `emotional-watercolor-sketch` | Emotional light-watercolor sketch | memory, relationships, restrained documentary |
| 11 | <a href="references/style-examples/11-retro-gouache-concept.png"><img src="references/style-examples/11-retro-gouache-concept.png" width="120" alt="Mid-century gouache concept sample"></a> | `retro-gouache-concept` | Mid-century gouache concept | nostalgia, cities, warm drama |
| 12 | <a href="references/style-examples/12-sunlit-storybook.png"><img src="references/style-examples/12-sunlit-storybook.png" width="120" alt="Sunlit storybook sample"></a> | `sunlit-storybook` | Sunlit storybook vis-dev | healing stories, fairy tales, family |
| 13 | <a href="references/style-examples/13-nordic-gouache-storybook.png"><img src="references/style-examples/13-nordic-gouache-storybook.png" width="120" alt="Nordic gouache storybook sample"></a> | `nordic-gouache-storybook` | Nordic gouache storybook | quiet daily life, nature, bedtime stories |
| 14 | <a href="references/style-examples/14-inked-storybook.png"><img src="references/style-examples/14-inked-storybook.png" width="120" alt="Inked light-watercolor storybook sample"></a> | `inked-storybook` | Inked light-watercolor storybook | character scenes, youth, dialogue |
| 15 | <a href="references/style-examples/15-warm-flat-storybook.png"><img src="references/style-examples/15-warm-flat-storybook.png" width="120" alt="Warm flat storybook sample"></a> | `warm-flat-storybook` | Warm flat storybook | relationships, branding, light education |
| 16 | <a href="references/style-examples/16-naive-marker-notes.png"><img src="references/style-examples/16-naive-marker-notes.png" width="120" alt="Naive marker notes sample"></a> | `naive-marker-notes` | Naive marker notes | social posts, opinions, youth content |
| 17 | <a href="references/style-examples/17-zine-riso-collage.png"><img src="references/style-examples/17-zine-riso-collage.png" width="120" alt="Zine risograph collage sample"></a> | `zine-riso-collage` | Zine risograph collage | growth, travel, music culture |
| 18 | <a href="references/style-examples/18-organic-contour-doodle.png"><img src="references/style-examples/18-organic-contour-doodle.png" width="120" alt="Organic contour doodle sample"></a> | `organic-contour-doodle` | Organic contour doodle | lifestyle, food, brand stories |
| 19 | <a href="references/style-examples/19-whiteboard-explainer.png"><img src="references/style-examples/19-whiteboard-explainer.png" width="120" alt="Whiteboard explainer sample"></a> | `whiteboard-explainer` | Whiteboard explainer | tutorials, business concepts, timelines |
| 20 | <a href="references/style-examples/20-linocut-editorial.png"><img src="references/style-examples/20-linocut-editorial.png" width="120" alt="Linocut editorial sample"></a> | `linocut-editorial` | Linocut editorial | social issues, history, fables |

List styles and their example paths:

```bash
python3 scripts/run_story_video.py --list-styles
```

Select a style by order, id, Chinese name, English name, or alias:

```bash
python3 scripts/run_story_video.py \
  --input examples/story.txt \
  --title "Paper Summer" \
  --style ink-wash \
  --mode plan
```

The machine-readable recipes live in [references/handdrawn-style-library.json](references/handdrawn-style-library.json). Its `contact_sheet` points to the overview and each `example_image` points to an individual sample. Recipes adapted from [hand-drawn-styles](https://github.com/threerocks/hand-drawn-styles) retain MIT attribution in [references/handdrawn-styles-LICENSE.txt](references/handdrawn-styles-LICENSE.txt).

### Outputs

| Input | Mode | Path |
| --- | --- | --- |
| Story text | final | `out/picture_silent.mp4` |
| Story text | preview | `out/picture_silent-preview.mp4` |
| Uploaded images | final | `out/uploaded_picture_silent.mp4` |
| Uploaded images | preview | `out/uploaded_picture_silent-preview.mp4` |

Final 1080×1440, preview 720×960, H.264, silent. The full behavior contract lives in [SKILL.md](skill-package/story-to-handdrawn-video/SKILL.md).

### GitHub Actions

Two workflows ship in `.github/workflows/`:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `check.yml` | push / PR / manual | Type check, plus an import + storyboard-validation smoke run on throwaway images |
| `render-uploaded.yml` | manual (workflow_dispatch) | Renders the ordered images in `inputs/` and uploads the video as an artifact |
| `render-story.yml` | manual (workflow_dispatch) | **One sentence (or a story file) → illustrations → video**, with FAL AI both expanding and drawing (needs a `FAL_KEY` secret) |

Commit your pages as `inputs/01.png`, `inputs/02.png`, …, then run **Actions → render-uploaded → Run workflow** and pick title, transition, layout, page duration, and quality. Download `out/*.mp4` from the run's artifacts.

Limits worth knowing:

- **One sentence becomes a story via `scripts/expand-story.mjs`.** The renderer splits on 。！？； and gives every beat one illustration, so a single sentence yields a single shot. This script sends the premise to FAL's `fal-ai/any-llm` (the same `FAL_KEY` the illustrations use) and asks for a story already shaped like a shot list: exactly N sentences, each under 30 characters, each independently drawable, with a turn before the ending — plus a character lock. That lock rides along in every illustration prompt and is what keeps a character's face consistent across shots; without it the renderer falls back to a generic description and identity drifts. Fill in `premise` in `render-story.yml` to take this path, or leave it empty to use `story_file`.
- **Shot design comes out of the same expansion.** Splitting sentences gives every beat the same default framing, so all eight shots sit at the same distance from the same subject. The expansion also asks for a `shots` array parallel to the story: only wide / full / medium / medium close-up, the close-up reserved for a reaction beat, and never the same framing twice in a row — framing is the only rhythm this format has. The result is written to `visual-plan.generated.json` and reaches each beat's `Scene direction:` via `--visual-plan`.
- **Keys have to line up, so the splitter now lives in `scripts/lib/split-story.mjs`.** Scene ids are numbered from the *split* story, and a sentence over 36 characters becomes two beats, shifting every id after it. The expander runs the same `splitStory` to work out the real ids before writing its keys; when a sentence splits, its beats share a shot. One implementation, imported by both, so the two can't drift.
- **Illustration generation comes from `tools/fal-imagegen/`.** This repo ships no image generator of its own: `runImage2()` in `scripts/story-to-video.mjs` hands the prompt file and reference images to `$CODEX_HOME/skills/.system/imagegen/scripts/image_gen.py`, a CLI that belongs to Codex. `tools/fal-imagegen/` reimplements that contract on top of `fal_image.py` from [delphichi/2025TRIP](https://github.com/delphichi/2025TRIP), which calls FAL AI's `gpt-image-2`. `render-story.yml` simply points `CODEX_HOME` at it — the renderer is untouched. Add a `FAL_KEY` repository secret to use it.
- **The default `--generator codex` still needs a human (or an agent).** It draws nothing; it only emits `codex-image-jobs.json` for an agent to fulfil, so running it in CI means running an actual agent in the workflow. `render-story.yml` takes the `--generator api` path instead.
- **Do not run `npm run check` as-is in CI.** `check:storyboard` asserts that every referenced PNG exists, and `public/assets/generated/` is gitignored, so it always fails on a clean checkout. The workflow runs `check:types` and validates a storyboard it builds during the run.
- **`package-lock.json` resolves all 231 packages from `registry.npmmirror.com`.** The workflows install with `npm ci --registry=https://registry.npmjs.org --replace-registry-host=always`.
- **Chrome Headless Shell is required.** The runner's preinstalled Chrome dropped old headless mode, so `npx remotion browser ensure` runs first (~150 MB from `remotion.media`; allowlist that host if egress is restricted).
- ffmpeg and ffprobe are both required; the workflows apt-install them when missing.

### License

[MIT](LICENSE). The bundled Ma Shan Zheng font is under the [SIL Open Font License](public/fonts/OFL-MaShanZheng.txt).
