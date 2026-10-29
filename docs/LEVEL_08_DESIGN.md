# Level 8 · Car Garage（小汽车进车库 · 不进位加法）

> 把「一捆积木」换成「一栋车库」：十位车库永远停满 10 辆，只往个位车库加车。
> 3 幕教学 + 10 题（顺序每局打乱），三种题型混排，其中题型 A 是「先拖车、再作答」的两段式。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv08.js` |
| 数据 | `levels_data.js` → `levels[8]` |
| 语音 | `voice/lv08/`（22 条）+ `voice/common/`（4 条），合计 90.8 秒（关内 79.0 秒） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 拖车后点总数 3、选车库组合 3 张卡、横式点数字 3（见铁律 §6.5） |
| 车库 | 十位车库一排 10 辆（18×25px）；个位车库 3 列固定车位，最多 9 个 |
| 拖拽 | 车辆落入个位车库，热区外扩 `HIT_PAD = 14px`、未命中 320 ms 三段弹回、轻点兜底（铁律 §5.9） |
| 判定 | 10 题首轮全对 = 金星并解锁 L9；有错 = 银星，题号不前进 |

---

## 1. 语音清单（22 条，全部英文）

### 教学（8 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Look at the garage! Here is one full row of ten cars. | 5.23s |
| `t1_b` | And two more cars. That's twelve cars. | 4.27s |
| `t1_c` | Now, three new cars are coming. | 2.86s |
| `t2_a` | We put the new cars in the ones garage. | 3.58s |
| `t2_b` | Two cars plus three cars equals five cars. | 5.50s |
| `t2_c` | So, twelve plus three equals fifteen! One ten and five ones. | 6.46s |
| `t3_a` | When we add, the ten garage stays the same. | 4.73s |
| `t3_b` | We only add the ones garage. | 3.12s |

> 三幕教学**都没有问句**（台词按要求给定），因此不涉及「问句悬空」。
> `t1_b` 与 `t1_c` 之间由代码 `await sleep(1000)` 停一拍，是「先数清、再说新车来了」的演示节拍。

### 题型 A · 拖车再点总数（7 条 + 1 条共用）

| key | 台词 | 题目 |
|---|---|---|
| `a1_a` | There are thirteen cars. | 13 + 2 |
| `a1_b` | Drag two more cars into the ones garage. | |
| `a2_a` | There are fourteen cars. | 14 + 3 |
| `a2_b` | Drag three more cars into the ones garage. | |
| `a3_a` | There are eleven cars. | 11 + 5 |
| `a3_b` | Drag five more cars into the ones garage. | |
| `a4_a` | There are sixteen cars. | 16 + 2 |
| `how_many` | How many cars in total? | 四题共用 |

> 第四题「Drag two more cars into the ones garage.」直接复用 `a1_b`（同一句话只花一次钱）。
> `how_many` 在**车辆全部进库之后**才播，接着才出现数字键——操作段不提前暴露答案。

### 题型 B · 听算式选车库（3 条）

| key | 台词 | 目标卡 |
|---|---|---|
| `b1_q` | Find twelve plus three. | 个位停 2 辆 + 车道 3 辆 |
| `b2_q` | Find thirteen plus four. | 个位停 3 辆 + 车道 4 辆 |
| `b3_q` | Find eleven plus five. | 个位停 1 辆 + 车道 5 辆 |

### 题型 C · 横式点数字（3 条）

| key | 台词 | 答案 |
|---|---|---|
| `c1_q` | Fourteen plus three. Touch the correct number. | 17 |
| `c2_q` | Twelve plus six. Touch the correct number. | 18 |
| `c3_q` | Fifteen plus four. Touch the correct number. | 19 |

> 答题环节**绝不自动补答案**，题干播完画面留白。

---

## 2. 教学分镜

### 第一幕：认识车库与汽车

- 画面：一栋车库楼，左边**十位车库**一排 10 辆，右边**个位车库**，楼下的车道先不出现。
- `t1_a` 时楼体与 10 辆车依次落座（每辆间隔 26 ms）；说完「one full row of ten cars」后
  2 辆浅蓝车停进个位车库，配 `t1_b`（「And two more cars. That's twelve cars.」）。
- 停 1 秒 → `t1_c`（「Now, three new cars are coming.」）与 3 辆珊瑚色小车同时开始：
  车道淡入，3 辆车从屏幕右侧依次开进来（间隔 240 ms），到位时做一次「刹车点头」（`scale(1.08,.9)` → `1`）。
- 播完定格，点屏幕任意位置进入第二幕。

### 第二幕：个位相加，十位不动

- 画面：同一栋楼，3 辆车停在车道。
- `t2_a`（「We put the new cars in the ones garage.」）时 3 辆车依次开进个位车库
  （间隔 460 ms），每辆从车道位置飞进车位并带悬挂挤压；十位车库那 10 辆一动不动。
- 车道车全部进库后淡出（只 `opacity: 0`，占位不删，§5.7）。
- `t2_b`（「Two cars plus three cars equals five cars.」）按语音节奏先弹原来 2 辆、再弹新来的 3 辆，
  最后 5 辆一起弹，个位车库套上绿环并浮出「5」徽标。
- `t2_c`（「So, twelve plus three equals fifteen! One ten and five ones.」）播完定格，点屏幕进入第三幕。

### 第三幕：竖式，十位车库不动

- 画面：小一号的车库（14px 车）+ 竖式 `12 / +3 / —— / 15`（+3 对齐个位，十位留虚线空格）。
- `t3_a`（「When we add, the ten garage stays the same.」）→ 十位车库套上金色呼吸环，
  竖式里两颗十位 `1` 变金色脉动。
- `t3_b`（「We only add the ones garage.」）→ 个位车库套上绿环，个位两颗数字变绿；
  1.4 秒后和行淡入，`15` 弹出来。
- 播完定格，点屏幕 → `common/ready` → 进答题。

---

## 3. 题型

### A · 拖车进库，再点总数（4 题）

车库停着 `10 + ones` 辆，车道上有 `add` 辆新车。先播「There are thirteen cars.」「Drag two more cars into the ones garage.」，
孩子把车**拖进（或轻点）个位车库**，每进一辆车位亮一下、播放轻音效；全部进库后才播「How many cars in total?」
并出现 3 个数字键。答案 = `10 + ones + add`。

两段式：操作段**不判分**，拖到别处只弹回；作答段答错才记错。

### B · 听算式选车库（3 题）

竖排 3 张卡，每张是「卷帘门 10 + 个位停着 a 辆 + 车道上 b 辆」。
听到「Find twelve plus three.」选出 `a = 2, b = 3` 的那张。
三张卡的 `(a, b)` 两两只差一个维度（如 2/3、1/3、2/4），逼孩子两边都核对。

### C · 横式点数字（3 题）

`14 + 3 = ▢`，下方 3 个数字键。点对了空格填上答案并转绿。

---

## 4. 实现要点

- `garage({ capacity, cw, ch })` 生成一整栋楼：十位车库固定 10 辆、个位车库按 `capacity` **先建好全部车位**，
  之后只往空位里塞车，所以已停车辆坐标永不变化（§5.7 实测 `dx = dy = 0`）。
- `fill(tone)` 是唯一入口（返回新车节点并自增计数）——**不要绕过它直接 append**，否则内部计数与 DOM 不同步，
  新车会叠进已占用的车位（本轮踩过）。
- `parkFrom(car, x, y)`：车已在车位里，用 `transform` 从落点 `translate + scale(1.44)` 飞入，
  到位置时 `scale(1.08, .9)` 压一下再回弹——汽车落位不做「砸地」压扁，用悬挂下沉更合理（§5.11 允许同样是三段）。
- `driveIn(pick, delay)`：从 `translateX(280px)` 滑入车道，最后一段 `scale(1.08, .9)` 收尾，读作刹车点头。
- 车道用 `.l8-lane` 的一条浅色路肩 + 底部虚线表示「还没停进去」；车全部进库后 `.is-clear` 淡出。
- 题型 A 的托盘**提前**加 `.lv-tray--reserved { min-height: 104px }`：数字键迟一步出现，
  不预留就会把整栋楼顶高 39 px（实测）。
- 拖拽：`pointerdown` 复制 `.l8-ghost`（`position: fixed`）跟手；`pointerup` 时先 `elementFromPoint`
  看是不是落在个位车库里，再按「四边外扩 `HIT_PAD`」兜底；未命中 → 320 ms 三段弹回并销毁 ghost。
- 语音链 `saySeq(keys)` 带 token；题型 A 的三段语音由 `buildDragQuestion().speak()` 串，
  `how_many` 则要等车辆全部进库后由 `beginPhaseTwo()` 触发。

---

## 5. 验收结果（2026-10-29）

- 26 条音频（22 关内 + 4 公共）全部 `decodeAudioData` 成功，合计 **90.8 秒 / 711 KB**（关内 79.0 秒，预算 1.5 MB）；
- 10 题全对 → `result-star--gold`，`Progress.summary().unlockedLevel = 9`；
- 四道拖车题实测：车库初始 3 / 4 / 1 / 6 辆、车道 2 / 3 / 5 / 2 辆，
  拖完（第一辆走拖拽、其余轻点）后车位数为 **5 / 7 / 6 / 8**，与 `ones + add` 完全一致；
- 三道选车库题实测：卡片 `[2x4, 2x3, 1x3] / [2x4, 3x4, 3x3] / [1x4, 2x5, 1x5]`，目标卡都在；
- 三道横式题实测：`14+3`、`12+6`、`15+4` 点对后空格分别填上 `17 / 18 / 19`；
- 热区实测：个位车库右边界外 **13px** 拖进去能落子（车位 +1、车道少 1 辆）、外 **16px** 不落子
  （ghost 320ms 后从 DOM 移除、车位不变、题目不前进）；
- 答错实测：拖车题的三个数字键 `[14,16,15]` → `[15,14,16]`（答案位置 2 → 0）；
  选车库题 `[1x3,2x4,2x3]` → `[2x3,2x4,1x3]`（答案位置 2 → 0）；
  横式题空位闪红后复原为 `?`，数字键 `[18,17,16]` → `[17,18,16]`（答案位置 1 → 0），三种都停在原题；
- 位置稳定实测：车辆落位前后，已停 3 辆车的坐标 `dx = dy = 0`，十位车库与整栋楼 `0 / 0`；
- 教学三幕实测：第一幕 10 + 2 + 车道 3；第二幕个位 5 辆、`.is-joined` = 1、徽标「5」；第三幕竖式 `1|2 / 3 / 1|5`，十位 2 格高亮；
- 三种题型 `scrollWidth === 390`，全流程 `innerText` 与 `aria-label` / `title` / `alt` 无 CJK，`lang = en`；
- 地图 8 个节点：最小间距 10px、最低标签底边 771px vs 底部提示 779px、最高圆盘顶 87px（地图框顶 76px）；
- 素材缓存：清空 Cache Storage 后首进 677 ms 并显示读条（22 个请求 / 619 KB），二次进入 186 ms、读条不出现。
