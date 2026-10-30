# Level 20 · Borrow a Ten（借十法 · 退位减法）

> 第三阶段第五关：个位不够减，就去十位借一个十回来。
> 3 幕教学（果篮里的十 + 零散一 → 小人把十拖过来散成十个一 → 竖式里 1 借走变 0、2 变 12）
> \+ 10 题（拖十散开再拿走 / 听算式选拆分图 / 找错误算式），整份打乱。
> 本关起按铁律 §5.17 自动挂载 `bg_20.jpg`；新增规则 §5.18（借十法与果篮 / 个位垫）。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv20.js` |
| 数据 | `levels_data.js` → `levels[20]`（含 `background` + `assets.images`） |
| 背景 | `assets/bg/bg_20.jpg`（48 张照片池中的一张，最长边 1024、约 34 KB） |
| 语音 | `voice/lv20/`（18 条）+ `voice/common/`（4 条），关内 77.7 秒 / 516 KB |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 点选 3 / 拆分图 3 / 找错句 3（§6.5） |
| 判定 | 首轮 10 题全对 = 金星并解锁 21；有错 = 银星，只到 20 |

---

## 1. 语音清单（18 条，全英文）

### 教学（9 条）

| key | 台词 | 时长 | 配的画面 |
|---|---|---|---|
| `t1_a` | Look! One ten and two ones make twelve. | 3.14s | 果篮里 10 个（挂 `10` 徽标）+ 垫上 2 个 |
| `t1_b` | Now, we need to take away eight. | 1.78s | 画面定格，让孩子先看清 12 与要减的 8 |
| `t1_c` | But we only have two ones. That's not enough! | 2.44s | 那 2 个苹果抖两下（`is-worry` + `shake`） |
| `t2_a` | So, we borrow one ten from the tens! | 2.33s | 小人从右边跑到果篮前，篮子发光（`is-grab`） |
| `t2_b` | Now we have twelve ones. | 1.63s | 篮里 10 个依次飞进垫上空格，篮子变空 |
| `t2_c` | Twelve minus eight equals four. | 1.78s | 8 个苹果飞走，剩 4 个 |
| `t2_d` | So, twelve minus eight equals four! | 1.91s | 剩下 4 个被领圈框住并逐个弹跳 |
| `t3_a` | When we don't have enough ones, we borrow a ten. | 2.44s | 竖式出现，十位那一格开始呼吸 |
| `t3_b` | One ten becomes zero. And two ones become twelve. | 3.14s | 借位币从十位飞进个位 → 补 `0` 与 `12` |
| `t2_c`（复用） | Twelve minus eight equals four. | 1.78s | 结果 4 落在个位列，`12 − 8 = 4` 亮出 |

> 用户给的第一幕长句按 §2.5「单句 ≤14 词」拆成 `t1_a / t1_b`；
> 第二幕的「Twelve minus eight equals four. So, twelve minus eight equals four!」拆成 `t2_c / t2_d`；
> 第三幕的收尾句**复用** `t2_c`（§2.5：可复用的句子用同一 key 引用，不重新生成）。
> 教学里没有问句，因此不需要自问自答；每幕仍以「语音播完 + 定格 + 点击」收尾。

### 答题（9 条）

| key | 台词 | 用于 |
|---|---|---|
| `a1_q` | Thirteen minus nine. Borrow a ten and take away nine. | 题型 A（13 − 9） |
| `a2_q` | Fifteen minus eight. Borrow a ten and take away eight. | 题型 A（15 − 8） |
| `a3_q` | Fourteen minus six. Borrow a ten and take away six. | 题型 A（14 − 6） |
| `a4_q` | Twelve minus seven. Borrow a ten and take away seven. | 题型 A（12 − 7） |
| `a_ask_q` | How many are left? | 题型 A 拿够之后（共用） |
| `b1_q` | Find fifteen minus seven. | 题型 B（选 15 = 10 + 5 那张） |
| `b2_q` | Find twelve minus eight. | 题型 B（选 12 = 10 + 2 那张） |
| `b3_q` | Find seventeen minus nine. | 题型 B（选 17 = 10 + 7 那张） |
| `c_q` | Find the wrong number sentence. | 题型 C（共用） |

> 答题环节**绝不补答案**：`How many are left?` 播完即停，画面留白等孩子点数字（§6.1 只限教学）。

---

## 2. 教学分镜（3 幕，逐幕定格等点击）

### 第一幕 · 发现问题（12 − 8）

- 布景：左「果篮」（10 个苹果 5 × 2，篮口一道沿，左上角挂 `10` 徽标），右「个位垫」（5 列 × 3 行 15 格，自下往上填）。
- 12 = 10 + 2：篮里 10 个、垫上 2 个，同坐在一条桌沿上。
- `t1_a` 说完停 1 秒 → `t1_b`（要拿走 8 个）→ 停 1 秒 → `t1_c`（只有 2 个，不够），说到「two ones」时那 2 个苹果抖两下。

### 第二幕 · 借东西

- 小人（`ICONS.buddy`，纯 SVG）从右侧跑到果篮前，停在篮子右沿（`--bx` 位移，腿 4 拍摆动后停）。
- 篮子发光 → 10 个苹果按 52 ms 间隔依次飞进垫上空格（520 ms 飞行 + §5.11 三段形变），篮子变空并压暗。
- `Now we have twelve ones.` → 垫上 12 个。
- 停 1 秒 → `Twelve minus eight equals four.` 时 8 个依次飞走 → `So, twelve minus eight equals four!` 时剩下的 4 个被领圈框住并弹跳。

### 第三幕 · 总结规律（竖式）

- 竖式：十位 `1`、个位 `2`；`−` 右对齐放在十位列；横线只覆盖两列；结果只落个位列。
- `t3_a` 说到「borrow a ten」时十位那一格开始呼吸（`is-armed`）。
- `t3_b`：一枚 `1` 的借位币从十位飞进个位（620 ms）→ 十位的 `1` 划掉、右上补 `0`；个位的 `2` 划掉、右上补 `12`。
- 最后 `12 − 8 = 4` 亮出，结果 4 落进个位列（绿色）。

---

## 3. 答题（10 题，整份打乱）

| # | 型 | 题目 | 玩法 | 选项 |
|---|---|---|---|---|
| A ×4 | `borrow` | 13−9 / 15−8 / 14−6 / 12−7 | 把果篮（那个十）拖到个位垫上散成十个一 → 拿走 b 个 → 点「还剩几个」 | 3 个数字键 |
| B ×3 | `pick` | 15−7 / 12−8 / 17−9 | 听算式，点出「10 + 零散」对得上的那张拆分图 | 3 张图卡 |
| C ×3 | `wrong` | 见下 | 三句里点出**不成立**的那一句 | 3 句算式卡 |

- **A 型两道关卡**：① 果篮只能拖/点一次；② 拿够 b 个之前**不出选项**（§6.8），拿够后 0.28 s 播 `How many are left?` 并渲染 3 个键。
- **B 型的干扰纪律**（§6.14）：三张图的总数两两不同，干扰图之和 ≠ 目标和。
- **C 型**（§6.11）：三句里恰好一句 `a − b ≠ shown`，三句都借位；答对后只翻结果格并定格 1.5 秒。

| 题 | 三句 | 错的那句 | 错法 |
|---|---|---|---|
| C1 | 12−7=5 / 15−8=7 / 14−6=9 | 14−6=9 | +1（应为 8） |
| C2 | 13−6=7 / 16−9=7 / 15−7=6 | 15−7=6 | −2（应为 8） |
| C3 | 14−8=6 / 11−4=7 / 17−9=10 | 17−9=10 | +2（应为 8） |

---

## 4. 关键实现

| 机制 | 做法 |
|---|---|
| 果篮 | `.l20-basket`：10 个苹果 5 × 2 + 蜡笔框 + 篮口沿（`::after`）+ `10` 徽标（`z-index: 3`，压在篮口之上） |
| 个位垫 | `.l20-mat` 5 × 3 共 15 格，`grid-row` 由 index 反推（第 0 格在左下），格位一辈子不动 |
| 借十 | `beginDrag()` 统一处理拖拽：幽灵 + 热区判定（垫外扩 14px）+ 未命中三段回弹；轻点果篮走同一条 `borrow()` |
| 散开 | `scatterTen()`：用篮子与格位的实际包围盒算 `--fx/--fy`，逐个飞入（52 ms 间隔），篮子苹果同步 `is-used` |
| 拿走 | 每颗苹果一次 `pointerdown` → 幽灵跟随 → 松手即淡出；只隐藏自身，其余与格位零位移（§5.7） |
| 领圈 | `ringAround()`：按剩余苹果的实际包围盒画一圈（§5.7.7） |
| 竖式借位 | `flyCoin()` 借位币 + `.is-borrowed` 斜杠 + `.l20-vmark` 小标 |
| 交接 | `level-lv20.js` 只注册 `LEVELS[20]`，未改 `engine.js` / `app.js`（§3.3） |

---

## 5. 验收记录（2026-10-30）

| 项 | 结果 |
|---|---|
| `node --check` | `level-lv20.js` / `levels_data.js` 通过 |
| 教学三幕 | 12 个一（篮 10 + 垫 2）→ 借十后垫上 12、篮空 → 领圈只剩 4 → 竖式补 `0` 与 `12`、结果 4 |
| 拖拽热区 | 垫右边界外 **13 px** 借出成功；外 **16 px** 只回弹、`try_again` 0 次、题号不动 |
| 两段式 | 拿够 b 个之前 `.l20-key` = 0；拿够后 = 3；剩余 = a − b（13−9→4、15−8→7、12−7→5） |
| 十题全流程 | 390 与 375 两次全对：gold、解锁 21、`try_again` 0 次、零 CJK、`scrollWidth === clientWidth` |
| 背景 | 首屏 `bg_` 请求 0；进关 1 条（blob）；二次进入 0 条且仍 `is-on`；退关无 `is-on`、图片清空 |
| 层级 / 白纱 | `z-index: -1`、`isolation: isolate`、`rgba(255,255,255,0.72)` |
| 音频 | 22 条全部 `duration > 0`（关内 77.7 秒） |
