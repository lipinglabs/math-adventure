# Level 25 · Addition Adventure（进位加法综合大闯关）

> 第三阶段大复习之一：把「凑十」讲透并复用到两位数。4 幕教学 + 10 题，挂 `bg_25.jpg`。

| 项 | 值 |
|---|---|
| 文件 | `level-lv25.js` · `levels[25]` |
| 语音 | `voice/lv25/` 10 条（+ common 4），Allison `-15` |
| 题型 | 点结果 4 / 凑十链四空 3 / 三算式找错 3 |

## 教学四幕

| 幕 | 画面 | 语音 |
|---|---|---|
| 1 | 十格阵 8 个红苹果 + 6 个绿苹果 | `t1_a` Eight plus six. Let's make a ten. |
| 2 | 2 个绿苹果飞进空格 → 框发光；外面剩 4 | `t1_b` Two more make ten. Ten plus four equals fourteen. |
| 3 | 数字 6 裂成 2 和 4，`8 + 2 = 10` → `10 + 4 = 14` | `t1_c` We split six into two and four. Eight plus two equals ten. |
| 4 | 竖式 `8 + 6 = 14`，十位落 1 | `t1_d` Eight plus six equals fourteen. |

## 答题

- **A（4）**：`9+5 / 8+7 / 7+5 / 9+6`，三个数字键。
- **B（3）**：四空凑十链 `a + b = a + [凑十] + [剩] = 10 + [剩] = [和]`；`7+5 / 9+4 / 6+5`。同值数字块是两块独立黏土块。
- **C（3）**：三张算式找错（`7+5=13` 应 12 等），答对后只翻结果格并定格 1.5 秒。

## 验收（2026-10-30）

390 与 375 各一遍：gold、解锁 26、`try_again` 0、零 CJK、无溢出；四空全部填满、放错弹回不记错、ghost 残留 0。
