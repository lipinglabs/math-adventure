# Level 02 · Balloon Take Away

> 状态：**已实现**（`level-lv02.js`）。
> 知识点：9 以内个位数减法（被减数 ≥ 3，减数 ≥ 1，结果 ≥ 1，不出现被减数 0）。
> 关联：`PROJECT_MATH_RULES.md §6.1 / §6.5`、`levels_data.js` 的 `levels[2]`。

---

## 1. 教学目标

| 项 | 内容 |
|---|---|
| 认知目标 | 理解 "take away" 就是从一堆里拿走，剩下的就是差 |
| 数量范围 | 被减数 3–9，减数 1–6，差 ≥ 1 |
| 题目数量 | 10 题，**每局进入时打乱顺序** |
| 题型 | 纯数字点选（4 个选项） |
| 时长 | 教学约 55 秒 + 10 题约 3 分钟 |

---

## 2. 教学三幕（点按推进）

> 铁律：教学里出现问句后，**停顿 1 秒必须播答案**，画面同步点数，绝不干等孩子回答。

### 第一幕 · 3 − 1

| 语音 | 时长 | 动画 |
|---|---|---|
| Look! Three balloons. | 2.4s | 三个气球依次弹入并开始轻轻上下浮动 |
| Pop! One balloon flew away. | 2.9s | 最右侧气球向上飘走、旋转、淡出（900ms） |
| （停顿 1 秒） | — | 画面定格 |
| How many left? | 1.4s | 画面静止，等答案语音 |
| （停顿 1 秒，铁律） | — | — |
| One, two. Two balloons! | 3.1s | 剩余两个气球依次弹跳，下方依次出现 2 个点数圆点 |

### 第二幕 · 5 − 2

| 语音 | 时长 | 动画 |
|---|---|---|
| Here are five balloons. Let's count. | 4.6s | 五个气球依次弹入：**上排 2 + 下排 3**，居中排在卡片内（行宽 176 / 268，卡片内容宽 308） |
| Two balloons flew away! | 3.1s | **上排两只**先后向上飘走（间隔 180ms）——轻物向上，且不会穿过下排 |
| （停顿 1 秒） | — | — |
| How many left? | 1.4s | 复用第一幕的音频文件 |
| （停顿 1 秒，铁律） | — | — |
| One, two, three. Three balloons left. | 4.8s | 下排三个**原地**逐个弹跳并出现圆点（位置零位移） |

### 第三幕 · 认识减号

| 语音 | 时长 | 动画 |
|---|---|---|
| The minus sign means take away. | 3.1s | 数字块 `5` `−` `2` 依次弹入 |
| Five take away two equals three. | 3.3s | 下方 5 个圆点，右侧 2 个缩小消失；随后补上 `=` 与 `3` |

> 实测时间轴（play 调用起点）：0.00 → 2.45 → 6.40 → 8.90 秒，
> 即「气球飘走后停 1.05 秒问」「问句结束后停 1.10 秒答」，符合 §6.1。

---

## 3. 答题环节

- 画面：`a` 个气球弹入 → 1.2 秒后 `b` 个气球飘走 → 剩余 `a − b` 个可见。
- 语音：`Listen. <A> balloons. <B> flew away. How many left? Tap the right number.`
  每题一条独立音频（`q1`–`q10`），随题目一起打乱。
- 选项：4 个纯数字按钮（全局铁律），干扰项取离答案最近的数；答错立即重排。
- 飞走的气球**不销毁占位**：`slot` 留在文档流，只把气球本体 `visibility: hidden`；
  剩余气球坐标在整个题目生命周期内不变（§5.7）。
- 反馈：答对 = 金币音 + 星星音 + 剩余气球依次弹跳，650ms 后下一题；答错 = 摇晃 + `try_again`（每题一次）+ 重排，原地重做。

### 十道题

| key | 算式 | 差 | 题干里的数字 |
|---|---|---|---|
| q1 | 3 − 1 | 2 | Three / One |
| q2 | 5 − 2 | 3 | Five / Two |
| q3 | 6 − 1 | 5 | Six / One |
| q4 | 7 − 4 | 3 | Seven / Four |
| q5 | 8 − 3 | 5 | Eight / Three |
| q6 | 9 − 2 | 7 | Nine / Two |
| q7 | 4 − 3 | 1 | Four / Three |
| q8 | 9 − 5 | 4 | Nine / Five |
| q9 | 8 − 6 | 2 | Eight / Six |
| q10 | 7 − 1 | 6 | Seven / One |

---

## 4. 视觉规范

- 气球：内联 SVG，`currentColor` 上色，九色循环（粉 / 蓝 / 青 / 黄 / 紫 / 橙 / 绿 / 玫红 / 天蓝）。
- 浮动：`balloon-bob` 3.4s 循环，`translateY` 与 `rotate` 幅度 ≤ 8px / 1.6°，仅用于教学与答题的静态展示。
- 飘走：`translateY(-160px)` + 旋转 13° + 透明度归零，900ms；结束后从 DOM 删除。
- 教学与答题都用同一张「奶油卡片」托住，圆角 34px，避免大片留白。
- 运动预算：最多 9 个气球 + 4 个按钮 + 1 个特效，未超 10 的同屏上限。

---

## 5. 语音清单（19 条新增，全部 Allison / 0.85 倍）

`voice/common/` 复用 4 条（ready / try_again / gold / silver）。

| key | 文本 |
|---|---|
| t1_a | Look! Three balloons. |
| t1_b | Pop! One balloon flew away. |
| t1_q | How many left? |
| t1_c | One, two. Two balloons! |
| t2_a | Here are five balloons. Let's count. |
| t2_b | Two balloons flew away! |
| t2_c | One, two, three. Three balloons left. |
| t3_a | The minus sign means take away. |
| t3_b | Five take away two equals three. |
| q1–q10 | 见 §3 题干模板 |

合计 19 条，约 751 KB；单关总素材 23 条 ≈ 1.4 MB，仍在 1.5 MB 预算内。

---

## 6. 验收结果（2026-10-29）

- 19 条 mp3 全部可解码，时长 1.4–7.1 秒；
- 教学问句后实测 1.10 秒接答案语音，问答闭环成立；
- 10 题全对 → `gold`，`unlockedLevel = 3`；
- 每题 4 个选项，答错后顺序与答案位置都改变；
- 位置稳定：9 气球题飞走 5 只，剩余 4 只（含占位）坐标 `dx = dy = 0`；
  第二幕飞走上排 2 只，下排 3 只坐标保持 `61/153/245 × 458`；
- 点数圆点改绝对定位后，点数不再把气球顶起（此前会整体上移 9px）；
- 390×844 下三幕教学与答题均无溢出，9 气球题最高 3 行；
- 全流程界面零 CJK。
