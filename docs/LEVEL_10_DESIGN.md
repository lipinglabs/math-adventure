# Level 10 · Bird Branch（小鸟飞走 · 不退位减法）

> 第二阶段（知识点 C 的第 1 遍）：**18 − 5**。十位那一整枝不动，只从个位树枝上飞走几只。
> 3 幕教学 + 10 题（顺序每局打乱），三种题型混排。
> 这一轮同时把地图改成了「分 5 大阶段 + 左右滑动」的分页结构（铁律 §5.13）。

| 项 | 值 |
|---|---|
| 关卡文件 | `level-lv10.js` |
| 数据 | `levels_data.js` → `levels[10]` |
| 语音 | `voice/lv10/`（17 条）+ `voice/common/`（4 条），合计 72.5 秒（关内 60.7 秒） |
| 音色 | `en_female_allison_uranus_bigtts`，`speech_rate = -15` |
| 选项数 | 看鸟飞走点剩余 3、听总数选树枝 3 组、点掉指定数量再点剩余 3（见铁律 §6.5） |
| 舞台 | 两段树枝：十位枝 5 列 × 2 排（固定 10 只），个位枝 3 列向上堆叠 |
| 判定 | 10 题首轮全对 = 金星并解锁 L11；有错 = 银星，题号不前进 |

---

## 1. 语音清单（17 条，全部英文）

### 教学（6 条）

| key | 台词 | 时长 |
|---|---|---|
| `t1_a` | Look at the birds. One ten and eight ones make eighteen. | 5.21s |
| `t2_a` | Five birds fly away from the ones branch. | 4.08s |
| `t2_b` | We take away the ones. Eight minus five equals three. | 5.50s |
| `t2_c` | So, eighteen minus five equals thirteen! | 4.54s |
| `t3_a` | When we take away, the ten stays the same. | 3.82s |
| `t3_b` | We only subtract the ones. | 3.12s |

> 三幕教学**都没有问句**，所以不涉及「问句悬空」。`t2_a` 与 `t2_b` 之间、
> 每个动作与下一句之间各由代码停 1 秒，是「先看飞走、再说算式」的节拍。

### 题型 A · 看鸟飞走，点剩下几只（4 条 + 1 条共用问句）

| key | 台词 | 题目 |
|---|---|---|
| `a1_a` | There are sixteen birds. Four fly away. | 16 − 4 |
| `a2_a` | There are seventeen birds. Five fly away. | 17 − 5 |
| `a3_a` | There are eighteen birds. Three fly away. | 18 − 3 |
| `a4_a` | There are fifteen birds. Four fly away. | 15 − 4 |
| `how_many` | How many birds are left? | A / C 共用 |

> 题干与问句**拆成两条**：`a*_a` 随飞走动画一起播，等最后一只落地后 0.32 秒才播 `how_many`，
> 保证「问的时候画面已经是最终的鸟数」。这一句问完就停，绝不自动补答案。

### 题型 B · 听总数，点出对应的树枝（3 条）

| key | 台词 | 目标 |
|---|---|---|
| `b1_q` | Find the branch with eighteen birds. | 10 + 8 |
| `b2_q` | Find the branch with sixteen birds. | 10 + 6 |
| `b3_q` | Find the branch with thirteen birds. | 10 + 3 |

### 题型 C · 点掉指定数量，再点剩下几只（3 条 + `how_many`）

| key | 台词 | 题目 |
|---|---|---|
| `c1_q` | Take away six birds. | 19 − 6 = 13 |
| `c2_q` | Take away four birds. | 17 − 4 = 13 |
| `c3_q` | Take away seven birds. | 18 − 7 = 11 |

---

## 2. 教学分镜

### 第一幕：认识 18

- 画面：两根树枝。左边十位枝 10 只（5×2，一整块），右边个位枝 8 只（3+3+2，向上堆）。
- 两枝整组入场（同屏运动预算只有 10，不能 18 只鸟逐个弹，§5.3）。
- `t1_a`（「Look at the birds. One ten and eight ones make eighteen.」）→ 停 1 秒 → 定格等点击。

### 第二幕：飞走 5 只

- 画面同上，但个位枝有 8 只。
- `t2_a` 响起的同时，**从最上面一只开始**依次飞走 5 只（每只间隔 130 ms，单只 640 ms：
  先抬升、再加速斜飞、最后缩到 0.6 并淡出），翅膀同时扑腾。
- 飞走后剩下的 3 只**一格都不挪**（§5.7）：只隐藏飞走的本体，格位仍占着，所以上半枝会空出来。
- 停 1 秒 → `t2_b`：绿色领圈**只圈住剩下那 3 只**，正上方浮出绿色「3」徽标，3 只各弹一下。
- `t2_c`（「So, eighteen minus five equals thirteen!」）→ 三只再一起弹 → 定格等点击。

### 第三幕：竖式规律

- 画面：左边一枝 10 只的小树枝 + 右边竖式 `18 / −5 / —— / 13`（减数行的十位留虚线空格）。
- `t3_a`（「When we take away, the ten stays the same.」）→ 十位树枝套金环、两个十位 `1` 变金。
- `t3_b`（「We only subtract the ones.」）→ `8`、`5`、`3` 三格转绿各弹一下。
- 播完定格，点屏幕 → `common/ready` → 进答题。

---

## 3. 题型

### A · 看鸟飞走，点剩下几只（4 题）

树枝上 `a` 只（10 + 零散），`a*_a` 里说的几只依次飞走；全部落地后 0.32 秒播 `how_many`，
再浮出 3 个数字键。答案 = `a − b`。

### B · 听总数，点出对应的树枝（3 题）

三张卡各是一根「10 + n 只」的树枝（十位枝 5×2 + 加号 + 个位枝）。听总数点对的卡。
三张卡的 `n` 互不相同，且只差一两只，必须真的数。

### C · 点掉指定数量，再点剩下几只（3 题）

两段式（§6.8）：
1. 只有 `c*_q` 一句（「Take away six birds.」），**不出选项**；
2. 个位枝亮起薄荷色虚线环 + 手势提示，孩子逐只点鸟（点一只飞一只，顶部小圆点灭一颗）；
3. 全部点完 → 领圈收紧到剩下的鸟、圆点淡出 → 0.42 秒后播 `how_many` → 才浮出 3 个数字键。

---

## 4. 实现要点

- **树枝结构**：`.l10-group` 是 `flex-direction: column-reverse` 的行堆叠，第一行 DOM 在最下面，
  所以「从树枝往上堆」；每只鸟有自己的 `.l10-slot` 格位，飞走只给鸟加 `is-gone`（`visibility: hidden`），
  格位不动 → 剩余鸟零位移（§5.7）。
- **十位枝必须是 5×2**：`boardOf()` 里十位枝固定 `cols: 5`，个位枝 3 列；
  早期版本漏传 `cols`，10 只被排成 3+3+3+1，一捆「十」就散了（见 §5.8 的同源要求）。
- **领圈与徽标按实际包围盒定位**：容器高度不会因为飞走而变小，边框画在容器上会圈进一大片空地。
  改用 `unionOf(host, slots)` 取剩余鸟的并集，再用绝对定位的 `.l10-ring` / 徽标去贴（§5.7 第 7 条）。
- **完成判定按「已飞走只数」计数**：`cleared += 1; if (cleared >= q.b) finishAction()`。
  若在每只的回调里判断 `left === 0`，**先落地的那只**会提前宣布全体完成，导致「还有鸟在飞就问剩几只」
  （§6.8 第 5 条）。
- **两段式托盘**：`.lv-tray--reserved { min-height: 104px }`，选项迟一步出现也不会把树枝顶上去。
- **手势提示挂在个位枝上**（`.l10-branch` 是 `position: relative`），`bottom: -48px`，
  正好指着要点的鸟；早期挂在 `.l10-scene` 上又没给父级 `position: relative`，
  一路找上 `.lv-story`，跑到等级栏上去了（与 L9 同源的坑）。
- **竖式横线**：先把终态 `scaleX(1)` 写进内联样式，再播「从 0 拉出」的动画；
  否则动画结束 `cancel()` 会回落到初始值，横线永远看不见。
- **运动预算**：教学两枝整组 `popIn`，绝不让 18 只鸟各弹一次；飞走 5 只各占 1 个预算（共 ≤10）。

---

## 5. 验收结果（2026-10-29）

- 21 条音频（17 关内 + 4 公共）全部 `decodeAudioData` 成功，合计 **72.5 秒 / 567 KB**（关内 60.7 秒，预算 1.5 MB）；
- 10 题全对 → `result-star--gold`，`Progress.summary().unlockedLevel = 11`；
- 四道飞走题实测：16 → 飞 4 → 剩 12；17 → 飞 5 → 剩 12；18 → 飞 3 → 剩 15；15 → 飞 4 → 剩 11，选项都含正确答案；
- 三道树枝题实测：三张卡的鸟数分别 `17,15,18` / `16,19,14` / `15,17,13`，恰好各有一张等于听到的总数；
- 三道消除题实测：19 点 6 只 → 剩 13；17 点 4 只 → 剩 13；18 点 7 只 → 剩 11；顶部圆点同步灭 6 / 4 / 7 颗；
- 消除完成后 0.42 秒才出选项，`usedDots` 与剩余鸟数完全对得上（把「先落地者提前完成」的 bug 修好后复测）；
- 位置稳定：19 只的题里点掉 3 只后，**全部 19 只鸟与 19 个格位坐标 `dx = dy = 0`**，树枝与整棵树 `0/0`，且此时仍未出选项；
- 答错重排：飞走题 `[12,14,13] → [14,12,13]`（答案 0→1）、树枝卡 `[7,8,5] → [5,7,8]`（1→2）、消除题 `[11,14,13] → [11,13,14]`（2→1），三型都停在同一题、`try_again` 各播 1 次；
- 三种题型 `scrollWidth === 390`；全流程 `innerText` 与 `aria-label` / `title` / `alt` 无 CJK，`lang = en`；
- 素材缓存：清空 Cache Storage 后首进 678 ms 并显示读条（17 个请求 / 475 KB），二次进入 167 ms、读条不出现；
- 地图：Stage 1 = 3 个节点 1 页；Stage 2 = 7 个节点 2 页（4 + 3）；滑动 40 px 不翻页、200 px 翻一页；
  打完 L3 自动滑到 Stage 2，重打 L1 不会被拽走；首阶段 `◀` 与末阶段 `▶` 为 `disabled`。
