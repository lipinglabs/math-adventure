# Level 27 · Stage 3 Finale（三阶结业挑战）

> 第三阶段最后一关：加减混合大考 + 结业仪式（§6.13）。4 幕教学 + 10 题混排，挂 `bg_27.jpg`。

| 项 | 值 |
|---|---|
| 文件 | `level-lv27.js` · `levels[27]` |
| 语音 | `voice/lv27/` 13 条（+ common 4），含结业语音 `t_gold` |
| 题型 | 加法 3 / 减法 4 / 混合挑错 3（整份打乱） |

## 教学四幕

| 幕 | 画面 | 语音 |
|---|---|---|
| 1 | 左 9+5（十格阵补第 10 个）、右 14−8（捆散开）**同时**演示 | `t1_a` Adding means making a ten. Taking away means breaking a ten. |
| 2 | 金色大奖杯从底部升起 | `t1_b` You finished Stage Three! |
| 3 | 奖杯定格 + 光芒呼吸 + STAGE 3 绶带 | `t1_c` You can add and take away big numbers. |
| 4 | 星旗 + 奖杯 + 绶带，邀请最终挑战 | `t1_d` Now, let's play the final challenge! |

## 答题十题（完全混合）

| 类 | 题数 | 题目 |
|---|---|---|
| 加法点选 | 3 | 26+13 / 38+16 / 47+25 |
| 减法点选 | 4 | 43−15 / 52−27 / 61−34 / 34−18 |
| 混合挑错 | 3 | 三句加减混排（52−27=26 应 25 等），答对后只翻结果格 |

## 结业仪式（金星专属）

- 触发：`LevelKit.showResult` 后 520 ms 建层；先播 `common/gold`，轮询到没有音频在播再播 `lv27/t_gold`（只播 1 次）。
- 三件套：**24 条彩带**（颜色 / 尺寸 / 落速 / 旋转各不相同）+ **170 px 金杯**（升起 520 ms + 光环呼吸）+ **STAGE 3 绶带**。
- 1.2 秒后可点击收起，4 秒自动收起；收起后结算页留常驻 `STAGE 3` 徽章；退关 `unmount()` 清层。

## 验收（2026-10-30）

390 与 375 各一遍：gold、解锁 28、`try_again` 0、零 CJK、无溢出；
仪式实测：`ceremony=true`、彩带 24、奖杯 1、绶带 `STAGE 3`、`t_gold` 1 次、6 秒内消失、徽章 1 个、退关后 `.l27-ceremony` 为 0。
