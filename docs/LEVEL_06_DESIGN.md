# Level 6 · Number Link（数字连线 · 11–19 半抽象匹配）

> 从「实物」退到「图 + 数字」：左边一串数字，右边一串十格阵图案，用手指把配对的连起来。
> 2 幕教学 + 10 题（顺序每局打乱），三种题型混排。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv06.js` |
| 数据 | `levels_data.js` → `levels[6]` |
| 语音 | `voice/lv06/`（16 条）+ `voice/common/`（4 条），合计 72.7 秒 |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 连线题左右各 3 张卡（无按钮选项）、看图选数 3（见铁律 §6.5） |
| 十格阵 | 严格 2 行 × 5 列，左上 → 右下填充（铁律 §5.8）；11–19 一律「一个满十 + 零散圆点」 |
| 连线 | 临时虚线跟随手指、`stroke-dashoffset` 一笔画出、热区外扩 `HIT_PAD = 14px`、两下轻点兜底（铁律 §5.10） |
| 判定 | 10 题首轮全对 = 金星并解锁 L7；有错 = 银星，题号不前进 |

---

## 1. 语音清单（16 条，全部英文）

### 教学（3 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Let's match the numbers and the pictures. Look at number thirteen. | 5.21s |
| `t1_b` | Thirteen is one ten and three ones. They match! | 5.23s |
| `t2_a` | Let's find sixteen. One ten and six ones. Yes, this is sixteen. | 7.58s |

> 两幕教学**都没有问句**（台词按要求给定），因此不涉及「问句悬空」；
> `t1_a` 说完「Look at number thirteen.」后由代码 `await sleep(1000)` 停一拍再落笔，是演示节拍，不是自问自答。

### 题型 A · 数字找图案（4 条）

| key | 台词 | 目标 |
|---|---|---|
| `a1_q` | Find fourteen and match it to the picture. | 14 |
| `a2_q` | Find eighteen and match it to the picture. | 18 |
| `a3_q` | Find twelve and match it to the picture. | 12 |
| `a4_q` | Find sixteen and match it to the picture. | 16 |

### 题型 B · 图案找数字（3 条 + 1 条共用）

| key | 台词 | 目标 |
|---|---|---|
| `b1_a` | Look at the picture with one ten and seven ones. | 17 |
| `b2_a` | Look at the picture with one ten and five ones. | 15 |
| `b3_a` | Look at the picture with one ten and nine ones. | 19 |
| `link_right` | Connect it to the right number. | 三题共用 |

> `b*_a` 与 `link_right` 是**两条独立 mp3**，由 `saySeq()` 依次播放（铁律 §6.7 独占，绝不叠音）。
> 拆开是因为整句 16 个单词超过 §2.5 的 14 词上限；共用句只生成一次，不重复花钱。

### 题型 C · 看图选数字（3 + 2 条共用）

| key | 台词 | 答案 |
|---|---|---|
| `c1_a` | This is one ten and nine ones. | 19 |
| `c2_a` | This is one ten and six ones. | 16 |
| `c3_a` | This is one ten and eight ones. | 18 |
| `how_many` | How many in total? | 三题共用 |
| `touch_num` | Touch the correct number. | 三题共用 |

> 答题环节**绝不自动补答案**，题干播完画面留白。

---

## 2. 教学分镜

### 第一幕：数与图的对应

- 画面：左侧数字列 `13 / 15 / 17`，右侧图案列 `10+5 / 10+7 / 10+3`（每局洗牌，顺序不固定）。
- `13` 从入场起带**金色呼吸环**（`.is-focus`），配合台词「Look at number thirteen.」。
- 台词 `t1_a` 播完 → 停 1 秒 → 一条绿线从 `13` 的右边缘**一笔画到** `10+3` 的左边缘（720 ms，`stroke-dashoffset`），
  同时播 `t1_b`；线画完转实心绿并加静态柔光，两张卡同时转绿。
- 播完定格，点屏幕任意位置进入第二幕。

### 第二幕：连线小技巧

- 画面：`16` 与 `10+6` 单行居中，间距 30px。
- `t2_a` 播到第 1.5 秒时落笔画线（780 ms），画完两张卡弹一下并转绿。
- 播完定格，点屏幕再进答题。

---

## 3. 题型

### A · 数字找图案（4 题）

左侧 3 个数字卡，右侧 3 个图案卡，两列各自独立洗牌。拖线把数字连到对应图案。

### B · 图案找数字（3 题）

布局镜像：左侧 3 个图案卡，右侧 3 个数字卡。

### C · 看图选数字（3 题）

中间一张大图案（`10 + 九/六/八`），下方 3 个数字键。答错重排。

---

## 4. 实现要点

- 图案卡 `picCard(ones, {cell, dot, cols})` = 满十阵（10 个 `.l6-dot`）+ 加号 + 3 列零散圆点；
  零散数最多 9（3×3），与十格阵的 2×5 保持「一个十 + 零散」的读法。
- 连线画布是一个**没有 viewBox 的 `<svg>`**（`position:absolute; inset:0`），坐标系就是像素，
  端点用 `getBoundingClientRect()` 现算，所以卡片尺寸一变线也跟着对。
- 线条是三次贝塞尔：控制点沿 x 方向外拉 `min(56, max(22, |dx| × 0.42))`，左→右、右→左都是平滑 S 形。
- `strokeDraw(path, ms)` 用 `stroke-dasharray = len` + `stroke-dashoffset: len → 0` 的 WAAPI 动画；
  `finished` 后把 `dashoffset` 写成 `0` 再 `cancel()`，防止末帧被撤销导致线消失。
- 连线层级：`.l6-lines { z-index: 0 }`、`.l6-col { z-index: 1 }` —— 线跨过别的卡片时被挡住，不糊在卡面上。
- 命中判定 `itemAt(x, y, mySide)`：先 `document.elementFromPoint` 取最上层卡片；
  取不到再按「点到矩形的最短距离 ≤ `HIT_PAD`」找最近的**对侧**卡片（这就是 §5.9 的 14px 外扩）。
- 交互两条路径合流到 `resolve(from, to)`：
  - 拖拽：`pointerdown` → `pointermove` 画临时虚线（`.l6-line--live`）→ `pointerup` 判定；
  - 轻点：第一下把卡片置为 `.is-armed`（蓝色呼吸环），第二下按下对侧卡片时直接 `resolve()`。
  位移 < 8px 视为轻点；拖到空处则取消选中，**不算答错**。
- `resolve()` 里连错 → 线变红（`.l6-line--bad`）、两张卡 `shake()`、560 ms 后移除该线、`wrong()` 记一次错；
  连对 → `dataset.done = '1'` + `.is-linked` 转绿 + 线条动画，若 `key === target` 则 560 ms 后 `correct()`。
- 语音链 `saySeq(keys)` 带 token：新链一旦启动，旧链的后续 `await` 会因 token 不符直接退出，**不会接错**。

---

## 5. 验收结果（2026-10-29）

- 20 条音频（16 关内 + 4 公共）全部 `decodeAudioData` 成功，合计 72.7 秒，569 KB（预算 1.5 MB）；
- 10 题全对 → `result-star--gold`，`Progress.summary().unlockedLevel = 7`；
- 七道连线题实测：左右两侧都含目标卡，落线后 `.is-linked` 为 2、`.l6-line.is-on` 为 1，随后自动进下一题；
- 三道看图选数实测：`keys` 分别为 `[16,19,18] / [16,18,14] / [18,16,19]`，答案键均在；
- 连错实测：红线上屏后被移除（残留线数 0）、两卡未锁定、`try_again` 播 1 次、题目不前进；
- 热区实测：目标卡右边界外 **13px** 连上成功、外 **16px** 连不上（连不上时不落子、不记错、取消选中）；
- 两下轻点实测：第一下 `.is-armed` = 1，第二下成线、`.is-on` = 1、`.is-linked` = 2、进入下一题；
- 看图选数答错重排实测：`[19,18,16]` → `[16,19,18]`，答案位置 0 → 1；
- 改错一题结算 `result-star--silver`，`unlockedLevel` 不前进；
- 390×844 无横向溢出（`scrollWidth === 390`），图案卡最大 332px ≤ 354px 内容宽；
- 地图 6 个节点：最低节点标签底边 772px、底部提示顶边 779px；最高节点圆盘顶 98px，均不越界；
- 教学两幕 + 答题 + 结算全程 `document.body.innerText` 与 `aria-label` 均无 CJK；
- 素材缓存：清空 Cache Storage 后首进 739 ms 并显示读条（16 个请求），二次进入 168 ms、读条不出现。
