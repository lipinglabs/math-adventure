# Level 01 · Apple Addition

> 状态：**已实现**（`level-lv01.js`）。
> 关联：`PROJECT_MATH_RULES.md §2.3 / §6`、`levels_data.js` 的 `levels[1]`。
> 语言：所有台词与界面文本均为英文，中文配音与中文 UI 已按 v2 铁律废止。

---

## 1. 教学目标

| 项 | 内容 |
|---|---|
| 认知目标 | 理解 "plus" 就是「合起来」；能把两组实物点数成总数 |
| 数量范围 | 两个加数都 ≥ 1，和 ≤ 5 |
| 题目覆盖 | 5 以内加法的全部 10 种有序组合，一种一题，不重复 |
| 前置知识 | 能数 1–5（不要求认数字符号） |
| 时长 | 教学约 60 秒 + 10 题约 3 分钟 |

第一关**不引入 0**、**不引入减法**、**不做拖拽**（点选对幼儿更稳）。

---

## 2. 十道题

| # | 算式 | 实物 | 题干语音 | 选项 |
|---|---|---|---|---|
| 1 | 1 + 1 | apple | One apple, and one more. How many altogether? | 1/2/3/4 |
| 2 | 1 + 2 | balloon | One balloon, and two more. How many altogether? | 1/2/3/4 |
| 3 | 2 + 1 | fish | Two fish, and one more. How many altogether? | 1/2/3/4 |
| 4 | 1 + 3 | apple | One apple, and three more. How many altogether? | 2/3/4/5 |
| 5 | 3 + 1 | star | Three stars, and one more. How many altogether? | 2/3/4/5 |
| 6 | 2 + 2 | balloon | Two balloons, and two more. How many altogether? | 2/3/4/5 |
| 7 | 1 + 4 | fish | One fish, and four more. How many altogether? | 2/3/4/5 |
| 8 | 4 + 1 | star | Four stars, and one more. How many altogether? | 2/3/4/5 |
| 9 | 2 + 3 | apple | Two apples, and three more. How many altogether? | 2/3/4/5 |
| 10 | 3 + 2 | balloon | Three balloons, and two more. How many altogether? | 2/3/4/5 |

- 选项固定 **4 个**纯数字键，只显示数字，不出现任何文字。
- 选项为「正确答案 + 3 个最接近的干扰项」；开局随机排布，**答错后立即重排**（内容不变，整体顺序与答案位置都必须变化）。
- 答错原地重做，选项在反馈后立即换位。

---

## 3. 教学分镜（三幕，每幕语音播完后定格等点击）

### 幕一 · 1 + 1（约 9 秒）

| 语音 | 动画 |
|---|---|
| Look! One apple. | 苹果从上方落下，着地挤压回弹（`translateY(-150px)` → 0，`scaleY` 1.08 → 0.8 → 1） |
| And one more. | 第二个苹果从右上方划弧落位，轻微旋转回正 |
| Let's count. One, two. | 两个圆点依次弹入 |
| One plus one equals two. | 虚线椭圆用 `stroke-dashoffset` 描出，把两个苹果圈住 |

### 幕二 · 2 + 2（约 10 秒）

| 语音 | 动画 |
|---|---|
| Here are two apples. | 盘子上已有两个苹果，静态展示 |
| Add two more. | 两个苹果先后落入（间隔 300ms），盘子轻微受压 |
| Let's count. One, two, three, four. | 四个圆点依次弹入 |
| Two plus two equals four. | 虚线椭圆圈住四个苹果 |

### 幕三 · 认识加号（约 8 秒）

| 语音 | 动画 |
|---|---|
| The plus sign means adding together. | 数字块「1」弹入，「＋」块随后弹出并果冻抖动 |
| One plus one equals two. | 「1」「＝」「2」依次弹入，组成 `1 + 1 = 2`，下方出现 2 个圆点 |

> 三幕都不判分、不显示选项；点屏幕任意位置进入下一幕；播完第三幕进入答题。
> 定格 2.8 秒后出现小手提示（只示范，不代替操作）。

---

## 4. 答题页

```
┌──────────────────────────┐
│  ←   Level 1  ●●●●●●●●●●  │  顶部：返回 + 10 个进度点
├──────────────────────────┤
│  ┌────────────────────┐  │
│  │  🍎   +   🍎🍎      │  │  实物卡片：左组 + 右组
│  │  ────────          │  │
│  └────────────────────┘  │
│                          │
│   ┌────┐ ┌────┐ ┌────┐   │  答题区：3 个黏土数字键
│   │ 3  │ │ 4  │ │ 5  │   │
│   └────┘ └────┘ └────┘   │
└──────────────────────────┘
```

| 事件 | 反馈 | 时序 |
|---|---|---|
| 点对 | 数字键变绿 + 金币音 + 星星音；「＋」缩小消失，两组靠拢；金星迸发；进度点前进 | **650ms** 后进下一题 |
| 点错 | 数字键摇晃 + 柔和下行音；`try_again` 语音（同一题只播一次）；**选项立即重排** | 不换题，原地重做 |
| 点喇叭 | 重播题干 | 随时可用 |

**严禁**在单题答对时播放任何人声。

---

## 5. 结算

| 结果 | 视觉 | 语音 | 按钮 |
|---|---|---|---|
| 10 题全对 | 金星 `scale .2 → 1.14 → 1`，8 道光芒展开 | Perfect! Gold star for you! | 重玩 ↻ / 回地图 ⌂ |
| 中途有错 | 银星同路径，4 道光芒 | Good job! Try again for a gold star! | 重玩 ↻ / 回地图 ⌂ |

- 金星：`Progress.record(1,'gold')` → 解锁第 2 关 → 触发云同步。
- 银星：`Progress.record(1,'silver')` → **不解锁**，可重玩刷金星。

---

## 6. 语音清单（23 条，全部 Allison，0.85 倍）

### 6.1 公共 `voice/common/`

| key | 文本 |
|---|---|
| `ready` | Are you ready? Let's play! |
| `try_again` | Try again, you can do it! |
| `gold` | Perfect! Gold star for you! |
| `silver` | Good job! Try again for a gold star! |

### 6.2 第一关 `voice/lv01/`

| key | 文本 |
|---|---|
| `t1_a` | Look! One apple. |
| `t1_b` | And one more. |
| `t1_c` | Let's count. One, two. |
| `t1_d` | One plus one equals two. |
| `t2_a` | Here are two apples. |
| `t2_b` | Add two more. |
| `t2_c` | Let's count. One, two, three, four. |
| `t2_d` | Two plus two equals four. |
| `t3_a` | The plus sign means adding together. |
| `q1`–`q10` | 见 §2 题干列 |

合计 23 条，约 640 KB，总时长约 80 秒。

---

## 7. 实现要点

1. 文件：`level-lv01.js`，注册 `window.LEVELS[1] = { mount, unmount }`。
2. 实物全部内联 SVG（苹果 / 气球 / 小鱼 / 星星），无外部图片、无生图接口。
3. 动画用 WAAPI 串行，配合 `Engine.audio.play()` 的 `ended` 事件对齐语音；不使用 `setTimeout` 猜时长（只有固定停顿用）。
4. 运动预算：每道题最多 5 个实物 + 3 个键帽 + 1 个特效，未超 10。
5. 退关 `unmount()` 清空定时器、取消动画、清空 `stage`。
6. 验收后门：`?quick=1` 跳过三幕教学直接进题。

---

## 8. 验收结果（2026-10-29）

- 23 条 mp3 全部可解码，总时长 79.9 秒；
- 10 题全对 → `gold`，`unlockedLevel = 2`；
- 中途错一题 → `silver`，`unlockedLevel` 保持 1；
- 每题 4 个选项；答错后整体顺序与答案位置都改变，选项集合不变；
- 三种最大题型（1+4 / 4+1 / 3+2）在 390×844 下单行不折行、无横向溢出；
- 全流程 `document.body.innerText` 不含 CJK，`aria-label` / `placeholder` 同样不含。
