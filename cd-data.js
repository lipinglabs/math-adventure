/* ============================================================
   cd-data.js · 乘除段（L28–L48）21 关槽数据
   ------------------------------------------------------------
   唯一依据：《乘除段 21 关按关策划案（定稿）》§3 逐关槽表。
   数字全在表里，不在实现者的直觉里。任何一格要改，先回改本文件。

   字段约定
     type       T1a T1c T2 T3a T4a T4b T4d T5 T6 T7a T7b T7c T8 serial
     a          组数 / 份数 / 盘数 / 袋数 / 盒数 / 堆数 / 行数
     b          每组数 / 每份数 / 每盘数 / 每袋数 / 每盒数 / 每堆数 / 每行数
     total      实物总数（T4a/T4b/T3a 用；T4b 恒为 a*b+1）
     q          题干语音 key
     hand       「一起做」时系统先代劳的步数（只出现在 S1）
     only8      综合关：永远 8 槽，无「一起做」
     askLeftover T4b 发完后要求把这 1 个「给谁」，L41 S6 判、L47 S5 只记录

   两处与文件的冲突，按逐关表执行（逐关表更具体，且附了论证）：
     ① §2.11 规则 6 说「判断型只出现在 S5/S7」，但 L29 S1/S2、L30 S3、
        L31 S1、L39 S4 都是判断型。以逐关槽表为准，断言只卡「末槽不是判断型」。
     ② 步数表说 T5 是 1–2 步，但 L35 §8 明确「两种数法都必须由孩子自己点出来」。
        以逐关为准：T5 步数 = 行数 + 列数。
   ============================================================ */

(function (global) {
  'use strict';

  var C = {
    /* ---------------- 第 1 关 · L28 · M1 一样多的小堆 ---------------- */
    28: {
      id: 28,
      name: 'Two Plates',
      tier: 'M1',
      intro: {
        props: ['cart', 'bo', 'plate', 'plate'],
        lines: ['lv28/s0a', 'lv28/s0b']
      },
      demo: {
        type: 'T4a', a: 2, b: 2, total: 4, item: 'bun', container: 'plate',
        lines: ['lv28/s0c', 'lv28/s0d', 'lv28/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'bun'], lines: ['lv28/out'] },
      slots: [
        { type: 'T4a', a: 2, b: 2, total: 4, hand: 1, q: 'lv28/s1' },
        { type: 'T4a', a: 2, b: 3, total: 6, q: 'lv28/s2' },
        { type: 'T4d', dist: [3, 3, 2], minIndex: 2, item: 'bun', container: 'plate', q: 'lv28/s3' },
        { type: 'T4a', a: 3, b: 3, total: 9, q: 'lv28/s4' },
        { type: 'T7c', groups: [3, 3], same: true, container: 'plate', q: 'lv28/s5' },
        { type: 'T4d', dist: [4, 4, 3], minIndex: 2, item: 'bun', container: 'plate', q: 'lv28/s6' },
        { type: 'T7c', groups: [4, 2], same: false, container: 'plate', q: 'lv28/s7' },
        { type: 'T4a', a: 3, b: 4, total: 12, q: 'lv28/s8' }
      ]
    },

    /* ---------------- 第 2 关 · L29 · M1 哪一堆是分好的 ---------------- */
    29: {
      id: 29,
      name: 'Which Tray',
      tier: 'M1',
      intro: {
        props: ['tray', 'tray', 'tray', 'bo'],
        lines: ['lv29/s0a', 'lv29/s0b']
      },
      demo: {
        type: 'T7a', answer: 0,
        options: [
          { groups: [4, 4] },
          { groups: [5, 3] },
          { groups: [4, 3] }
        ],
        lines: ['lv29/s0c', 'lv29/s0d']
      },
      outro: { style: 'last', marks: ['tray', 'bun'], lines: ['lv29/out'] },
      slots: [
        {
          type: 'T7a', answer: 1, q: 'lv29/s1',
          options: [{ groups: [3, 1] }, { groups: [2, 2] }, { groups: [1, 3] }]
        },
        {
          type: 'T7a', answer: 1, q: 'lv29/s2',
          options: [{ groups: [2, 3, 4] }, { groups: [3, 3, 3] }, { groups: [4, 4, 1] }]
        },
        { type: 'T4a', a: 3, b: 2, total: 6, q: 'lv29/s3' },
        { type: 'T4a', a: 2, b: 5, total: 10, q: 'lv29/s4' },
        { type: 'T7c', groups: [3, 4, 3], same: false, q: 'lv29/s5' },
        { type: 'T4a', a: 4, b: 2, total: 8, q: 'lv29/s6' },
        { type: 'T4a', a: 4, b: 3, total: 12, q: 'lv29/s7' },
        { type: 'T1a', a: 3, b: 3, container: 'box_m', q: 'lv29/s8' }
      ]
    },

    /* ---------------- 第 3 关 · L30 · M2 几个几 ---------------- */
    30: {
      id: 30,
      name: 'Groups of Four',
      tier: 'M2',
      intro: {
        props: ['cart', 'chirp', 'plate', 'plate', 'plate'],
        lines: ['lv30/s0a', 'lv30/s0b']
      },
      demo: {
        type: 'T1a', a: 3, b: 4, item: 'bun', container: 'plate',
        lines: ['lv30/s0c', 'lv30/s0d', 'lv30/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'plate', 'plate'], lines: ['lv30/out'] },
      slots: [
        { type: 'T1a', a: 2, b: 2, hand: 1, q: 'lv30/s1' },
        { type: 'T1a', a: 2, b: 3, q: 'lv30/s2' },
        {
          type: 'T7a', answer: 1, q: 'lv30/s3',
          options: [{ groups: [2, 2] }, { groups: [3, 3] }, { groups: [2, 3] }]
        },
        { type: 'T1a', a: 3, b: 3, q: 'lv30/s4' },
        {
          type: 'T8', a: 4, b: 3, hide: 'total', answer: 2, q: 'lv30/s5',
          options: [{ groups: [7] }, { groups: [9] }, { groups: [12] }]
        },
        { type: 'T1a', a: 4, b: 3, q: 'lv30/s6' },
        { type: 'T1a', a: 4, b: 5, q: 'lv30/s7' },
        { type: 'T1a', a: 4, b: 4, q: 'lv30/s8' }
      ]
    },

    /* ---------------- 第 4 关 · L31 · M2 看小堆说出指令 ---------------- */
    31: {
      id: 31,
      name: 'Read the Groups',
      tier: 'M2',
      intro: {
        props: ['tray', 'tray', 'tray', 'chirp'],
        lines: ['lv31/s0a', 'lv31/s0b']
      },
      demo: {
        type: 'T7a', answer: 0,
        options: [
          { groups: [4, 4, 4] },
          { groups: [3, 3, 3] },
          { groups: [3, 3, 3, 3] }
        ],
        lines: ['lv31/s0c', 'lv31/s0d']
      },
      outro: { style: 'last', marks: ['tray', 'bun'], lines: ['lv31/out'] },
      slots: [
        {
          type: 'T7a', answer: 0, q: 'lv31/s1',
          options: [{ groups: [2, 2] }, { groups: [2, 3] }, { groups: [4, 1] }]
        },
        { type: 'T2', a: 2, b: 3, q: 'lv31/s2' },
        { type: 'T1a', a: 3, b: 3, q: 'lv31/s3' },
        { type: 'T1a', a: 4, b: 2, q: 'lv31/s4' },
        {
          type: 'T8', a: 4, b: 2, hide: 'per', answer: 0, q: 'lv31/s5',
          options: [{ groups: [2] }, { groups: [4] }, { groups: [8] }]
        },
        { type: 'T1a', a: 4, b: 3, q: 'lv31/s6' },
        {
          type: 'T8', a: 5, b: 4, hide: 'total', answer: 2, q: 'lv31/s7',
          options: [{ groups: [9] }, { groups: [16] }, { groups: [20] }]
        },
        { type: 'T2', a: 4, b: 3, q: 'lv31/s8' }
      ]
    },

    /* ---------------- 第 5 关 · L32 · M3 一组一组数 ---------------- */
    32: {
      id: 32,
      name: 'Count by Groups',
      tier: 'M3',
      intro: {
        props: ['cart', 'bo', 'chirp'],
        lines: ['lv32/s0a', 'lv32/s0b']
      },
      demo: {
        type: 'T2', a: 4, b: 5, item: 'bun',
        lines: ['lv32/s0c', 'lv32/s0d', 'lv32/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'plate', 'plate', 'plate'], lines: ['lv32/out'] },
      slots: [
        { type: 'T2', a: 2, b: 2, q: 'lv32/s1' },
        { type: 'T1a', a: 3, b: 2, q: 'lv32/s2' },
        { type: 'T2', a: 4, b: 2, q: 'lv32/s3' },
        { type: 'T1a', a: 3, b: 5, q: 'lv32/s4' },
        {
          type: 'T8', a: 3, b: 5, hide: 'total', answer: 2, q: 'lv32/s5',
          options: [{ groups: [8] }, { groups: [10] }, { groups: [15] }]
        },
        { type: 'T1a', a: 2, b: 5, q: 'lv32/s6' },
        {
          type: 'T8', a: 5, b: 4, hide: 'total', answer: 2, q: 'lv32/s7',
          preCount: true,
          options: [{ groups: [9] }, { groups: [16] }, { groups: [20] }]
        },
        { type: 'T2', a: 4, b: 5, q: 'lv32/s8' }
      ]
    },

    /* ---------------- 第 6 关 · L33 · M3 跳数 ---------------- */
    33: {
      id: 33,
      name: 'Counting Bundles',
      tier: 'M3',
      intro: {
        props: ['cart', 'bundle5', 'bundle5', 'chirp'],
        lines: ['lv33/s0a', 'lv33/s0b']
      },
      demo: {
        type: 'T2', a: 4, b: 5, item: 'bundle5', compact: true,
        lines: ['lv33/s0c', 'lv33/s0d']
      },
      outro: { style: 'last', marks: ['bundle5', 'bundle5', 'bundle5'], lines: ['lv33/out'] },
      slots: [
        { type: 'T2', a: 2, b: 5, item: 'bundle5', q: 'lv33/s1' },
        { type: 'T1a', a: 3, b: 5, item: 'candle', container: 'tray', q: 'lv33/s2' },
        { type: 'T1a', a: 2, b: 5, item: 'candle', container: 'tray', q: 'lv33/s3' },
        { type: 'T2', a: 10, b: 5, item: 'bundle5', compact: true, m3: true, q: 'lv33/s4' },
        {
          type: 'T8', a: 3, b: 5, hide: 'total', answer: 2, q: 'lv33/s5',
          options: [{ groups: [8] }, { groups: [10] }, { groups: [15] }]
        },
        { type: 'T2', a: 10, b: 10, item: 'bundle10', compact: true, m3: true, q: 'lv33/s6' },
        {
          type: 'T7a', answer: 1, q: 'lv33/s7',
          options: [
            { containers: 6, kind: 'bundle5' },
            { containers: 10, kind: 'bundle5' },
            { containers: 8, kind: 'bundle5' }
          ]
        },
        { type: 'T1a', a: 4, b: 5, item: 'candle', container: 'tray', q: 'lv33/s8' }
      ]
    },

    /* ---------------- 第 7 关 · L34 · M4 阵列 ---------------- */
    34: {
      id: 34,
      name: 'The Big Tray',
      tier: 'M4',
      intro: {
        props: ['gridtray', 'bo', 'cart'],
        lines: ['lv34/s0a', 'lv34/s0b']
      },
      demo: {
        type: 'T1c', a: 3, b: 4, item: 'bun',
        lines: ['lv34/s0c', 'lv34/s0d', 'lv34/s0e']
      },
      outro: { style: 'last', marks: ['gridtray', 'bun'], lines: ['lv34/out'] },
      slots: [
        { type: 'T1c', a: 3, b: 2, hand: 1, q: 'lv34/s1' },
        { type: 'T1c', a: 4, b: 2, q: 'lv34/s2' },
        { type: 'T1c', a: 3, b: 4, q: 'lv34/s3' },
        {
          type: 'T8', a: 4, b: 3, hide: 'total', answer: 2, q: 'lv34/s4',
          item: 'bun', container: 'tray',
          options: [{ groups: [7] }, { groups: [9] }, { groups: [12] }]
        },
        {
          type: 'T7a', answer: 1, q: 'lv34/s5',
          options: [{ rows: 2, per: 3 }, { rows: 3, per: 2 }, { rows: 2, per: 2 }]
        },
        { type: 'T1c', a: 4, b: 3, q: 'lv34/s6' },
        {
          type: 'T8', a: 5, b: 2, hide: 'rows', answer: 1, q: 'lv34/s7',
          item: 'bun', container: 'tray',
          options: [{ groups: [2] }, { groups: [5] }, { groups: [10] }]
        },
        { type: 'T1c', a: 5, b: 4, q: 'lv34/s8' }
      ]
    },

    /* ---------------- 第 8 关 · L35 · M4 方阵里一共有几个 ---------------- */
    35: {
      id: 35,
      name: 'Count the Tray',
      tier: 'M4',
      intro: {
        props: ['gridtray', 'chirp'],
        lines: ['lv35/s0a', 'lv35/s0b']
      },
      demo: {
        type: 'T5', a: 3, b: 4, item: 'bun',
        lines: ['lv35/s0c', 'lv35/s0d', 'lv35/s0e']
      },
      outro: { style: 'last', marks: ['gridtray', 'bun'], lines: ['lv35/out'] },
      slots: [
        { type: 'T5', a: 2, b: 2, q: 'lv35/s1' },
        { type: 'T5', a: 3, b: 2, q: 'lv35/s2' },
        { type: 'T1c', a: 3, b: 4, q: 'lv35/s3' },
        {
          type: 'T8', a: 3, b: 4, hide: 'total', answer: 2, q: 'lv35/s4',
          item: 'bun', container: 'tray',
          options: [{ groups: [7] }, { groups: [10] }, { groups: [12] }]
        },
        { type: 'T1c', a: 4, b: 3, q: 'lv35/s5' },
        { type: 'T1c', a: 3, b: 3, q: 'lv35/s6' },
        { type: 'T1c', a: 4, b: 4, q: 'lv35/s7' },
        { type: 'T1c', a: 4, b: 5, q: 'lv35/s8' }
      ]
    },

    /* ---------------- 第 9 关 · L36 · M5 两种看法 ---------------- */
    36: {
      id: 36,
      name: 'Turn the Tray',
      tier: 'M5',
      intro: {
        props: ['gridtray', 'bo', 'chirp'],
        lines: ['lv36/s0a', 'lv36/s0b']
      },
      demo: {
        type: 'T5', a: 3, b: 4, item: 'bun',
        lines: ['lv36/s0c', 'lv36/s0d', 'lv36/s0e']
      },
      outro: { style: 'last', marks: ['gridtray', 'bun'], lines: ['lv36/out'] },
      slots: [
        { type: 'T5', a: 3, b: 4, q: 'lv36/s1' },
        { type: 'T1c', a: 3, b: 4, q: 'lv36/s2' },
        { type: 'T1c', a: 4, b: 3, q: 'lv36/s3' },
        {
          type: 'T8', a: 4, b: 3, hide: 'total', answer: 2, q: 'lv36/s4',
          item: 'bun', container: 'tray',
          options: [{ groups: [7] }, { groups: [9] }, { groups: [12] }]
        },
        { type: 'T1c', a: 4, b: 2, q: 'lv36/s5' },
        { type: 'T1c', a: 3, b: 3, q: 'lv36/s6' },
        {
          type: 'T6', answer: 0, q: 'lv36/s7', container: 'box_m',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [6] }]
        },
        { type: 'T1c', a: 5, b: 2, q: 'lv36/s8' }
      ]
    },

    /* ---------------- 第 10 关 · L37 · D1 轮流发 ---------------- */
    37: {
      id: 37,
      name: 'One Each',
      tier: 'D1',
      intro: {
        props: ['cart', 'plate', 'plate', 'momo'],
        lines: ['lv37/s0a', 'lv37/s0b']
      },
      demo: {
        type: 'T4a', a: 2, b: 3, total: 6, item: 'bun', container: 'plate',
        lines: ['lv37/s0c', 'lv37/s0d', 'lv37/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'bun'], lines: ['lv37/out'] },
      slots: [
        { type: 'T4a', a: 2, b: 2, total: 4, hand: 1, q: 'lv37/s1' },
        { type: 'T4a', a: 2, b: 4, total: 8, q: 'lv37/s2' },
        { type: 'T4a', a: 3, b: 4, total: 12, q: 'lv37/s3' },
        { type: 'T4a', a: 4, b: 3, total: 12, q: 'lv37/s4' },
        {
          type: 'T8', a: 3, b: 4, hide: 'per', answer: 1, q: 'lv37/s5',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [12] }]
        },
        { type: 'T4a', a: 2, b: 3, total: 6, q: 'lv37/s6' },
        {
          type: 'T7a', answer: 1, q: 'lv37/s7',
          options: [{ groups: [4, 4, 4] }, { groups: [3, 3, 3, 3] }, { groups: [2, 5, 3, 2] }]
        },
        { type: 'T4a', a: 3, b: 5, total: 15, q: 'lv37/s8' }
      ]
    },

    /* ---------------- 第 11 关 · L38 · D1 发到分完为止 ---------------- */
    38: {
      id: 38,
      name: 'All Shared',
      tier: 'D1',
      intro: {
        props: ['plate', 'plate', 'bo', 'chirp'],
        lines: ['lv38/s0a', 'lv38/s0b']
      },
      demo: {
        type: 'T4a', a: 2, b: 3, total: 6, item: 'bun', container: 'plate',
        lines: ['lv38/s0c', 'lv38/s0d', 'lv38/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'plate'], lines: ['lv38/out'] },
      slots: [
        { type: 'T4a', a: 2, b: 3, total: 6, hand: 1, q: 'lv38/s1' },
        { type: 'T4a', a: 3, b: 4, total: 12, q: 'lv38/s2' },
        { type: 'T4a', a: 4, b: 3, total: 12, q: 'lv38/s3' },
        { type: 'T4a', a: 4, b: 2, total: 8, q: 'lv38/s4' },
        {
          type: 'T8', a: 3, b: 4, hide: 'total', answer: 1, q: 'lv38/s5',
          options: [{ groups: [7] }, { groups: [12] }, { groups: [16] }]
        },
        { type: 'T4a', a: 2, b: 5, total: 10, q: 'lv38/s6' },
        { type: 'T2', a: 3, b: 4, q: 'lv38/s7' },
        { type: 'T4a', a: 3, b: 5, total: 15, q: 'lv38/s8' }
      ]
    },

    /* ---------------- 第 12 关 · L39 · D2 每人几个 ---------------- */
    39: {
      id: 39,
      name: 'How Many Each',
      tier: 'D2',
      intro: {
        props: ['cloth', 'plate', 'plate', 'bo'],
        lines: ['lv39/s0a', 'lv39/s0b']
      },
      demo: {
        type: 'T4a', a: 3, b: 2, total: 6, item: 'bun', container: 'plate',
        lines: ['lv39/s0c', 'lv39/s0d', 'lv39/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'plate', 'plate'], lines: ['lv39/out'] },
      slots: [
        { type: 'T4a', a: 2, b: 4, total: 8, hand: 1, q: 'lv39/s1' },
        { type: 'T4a', a: 3, b: 3, total: 9, q: 'lv39/s2' },
        { type: 'T4a', a: 3, b: 4, total: 12, q: 'lv39/s3' },
        {
          type: 'T7a', answer: 0, q: 'lv39/s4',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [6] }]
        },
        {
          type: 'T7a', answer: 2, q: 'lv39/s5',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [5] }]
        },
        { type: 'T4a', a: 2, b: 3, total: 6, q: 'lv39/s6' },
        { type: 'T4a', a: 2, b: 5, total: 10, q: 'lv39/s7' },
        { type: 'T4a', a: 4, b: 3, total: 12, q: 'lv39/s8' }
      ]
    },

    /* ---------------- 第 13 关 · L40 · D2 换个东西再分一次 ---------------- */
    40: {
      id: 40,
      name: 'Bags Today',
      tier: 'D2',
      intro: {
        props: ['bag', 'bag', 'block', 'bo'],
        lines: ['lv40/s0a', 'lv40/s0b']
      },
      demo: {
        type: 'T4a', a: 2, b: 4, total: 8, item: 'block', container: 'bag',
        lines: ['lv40/s0c', 'lv40/s0d', 'lv40/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'bag', 'box_m'], lines: ['lv40/out'] },
      slots: [
        { type: 'T4a', a: 2, b: 3, total: 6, item: 'block', container: 'box_m', hand: 1, q: 'lv40/s1' },
        { type: 'T4a', a: 2, b: 4, total: 8, item: 'block', container: 'box_m', q: 'lv40/s2' },
        { type: 'T4a', a: 4, b: 2, total: 8, item: 'block', container: 'box_m', q: 'lv40/s3' },
        { type: 'T1a', a: 3, b: 4, item: 'block', container: 'box_m', q: 'lv40/s4' },
        {
          type: 'T7a', answer: 1, q: 'lv40/s5',
          options: [{ groups: [2] }, { groups: [5] }, { groups: [8] }]
        },
        { type: 'T1a', a: 4, b: 3, item: 'block', container: 'box_m', q: 'lv40/s6' },
        { type: 'T4a', a: 4, b: 3, total: 12, item: 'block', container: 'box_m', q: 'lv40/s7' },
        { type: 'T1a', a: 4, b: 5, item: 'block', container: 'box_m', q: 'lv40/s8' }
      ]
    },

    /* ---------------- 第 14 关 · L41 · D3 分不完怎么办 ---------------- */
    41: {
      id: 41,
      name: 'One Is Left',
      tier: 'D3',
      intro: {
        props: ['jar', 'jar', 'plate', 'plate', 'plate'],
        lines: ['lv41/s0a', 'lv41/s0b']
      },
      demo: {
        type: 'T4b', a: 3, b: 1, total: 4, item: 'jar', container: 'plate',
        lines: ['lv41/s0c', 'lv41/s0d', 'lv41/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'jar', 'saucer'], lines: ['lv41/out'] },
      slots: [
        { type: 'T4b', a: 2, b: 2, total: 5, item: 'jar', hand: 1, q: 'lv41/s1' },
        { type: 'T4b', a: 2, b: 3, total: 7, item: 'jar', q: 'lv41/s2' },
        { type: 'T4b', a: 2, b: 4, total: 9, item: 'jar', q: 'lv41/s3' },
        { type: 'T4b', a: 3, b: 2, total: 7, item: 'jar', q: 'lv41/s4' },
        {
          type: 'T8', a: 3, b: 3, hide: 'per', answer: 0, q: 'lv41/s5',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [10] }]
        },
        {
          type: 'T4b', a: 3, b: 3, total: 10, item: 'jar',
          askLeftover: true, q: 'lv41/s6', q2: 'lv41/s6b'
        },
        {
          type: 'T8', a: 4, b: 3, hide: 'total', answer: 1, q: 'lv41/s7',
          options: [{ groups: [12] }, { groups: [13] }, { groups: [14] }]
        },
        { type: 'T4b', a: 4, b: 3, total: 13, item: 'jar', q: 'lv41/s8' }
      ]
    },

    /* ---------------- 第 15 关 · L42 · D4 装几盒 ---------------- */
    42: {
      id: 42,
      name: 'Fill the Boxes',
      tier: 'D4',
      intro: {
        props: ['bag', 'box_s', 'cart', 'chirp'],
        lines: ['lv42/s0a', 'lv42/s0b']
      },
      demo: {
        type: 'T3a', total: 6, b: 2, item: 'bun', container: 'box_s',
        lines: ['lv42/s0c', 'lv42/s0d', 'lv42/s0e']
      },
      outro: { style: 'last', marks: ['box_s', 'box_m'], lines: ['lv42/out'] },
      slots: [
        { type: 'T3a', total: 6, b: 2, container: 'box_s', hand: 1, q: 'lv42/s1' },
        { type: 'T3a', total: 8, b: 2, container: 'box_s', q: 'lv42/s2' },
        { type: 'T3a', total: 10, b: 2, container: 'box_s', q: 'lv42/s3' },
        { type: 'T3a', total: 6, b: 3, container: 'box_m', q: 'lv42/s4' },
        {
          type: 'T6', answer: 0, q: 'lv42/s5', container: 'box_m',
          options: [
            { containers: 4, kind: 'box_m' },
            { containers: 3, kind: 'box_m' },
            { containers: 5, kind: 'box_m' }
          ]
        },
        { type: 'T3a', total: 9, b: 3, container: 'box_m', q: 'lv42/s6' },
        { type: 'T3a', total: 12, b: 3, container: 'box_m', q: 'lv42/s7' },
        { type: 'T3a', total: 15, b: 3, container: 'box_m', q: 'lv42/s8' }
      ]
    },

    /* ---------------- 第 16 关 · L43 · D4 装几盒（换装法） ---------------- */
    43: {
      id: 43,
      name: 'Bigger Boxes',
      tier: 'D4',
      intro: {
        props: ['box_m', 'box_l', 'cart', 'bo'],
        lines: ['lv43/s0a', 'lv43/s0b']
      },
      demo: {
        type: 'T3a', total: 15, b: 5, item: 'bun', container: 'box_l',
        lines: ['lv43/s0c', 'lv43/s0d', 'lv43/s0e']
      },
      outro: { style: 'last', marks: ['box_l', 'box_m'], lines: ['lv43/out'] },
      slots: [
        { type: 'T3a', total: 8, b: 4, container: 'box_l', hand: 1, q: 'lv43/s1' },
        { type: 'T3a', total: 12, b: 4, container: 'box_l', q: 'lv43/s2' },
        { type: 'T3a', total: 16, b: 4, container: 'box_l', q: 'lv43/s3' },
        {
          type: 'T6', answer: 0, q: 'lv43/s4', container: 'box_l',
          options: [
            { containers: 5, kind: 'box_l' },
            { containers: 4, kind: 'box_l' },
            { containers: 6, kind: 'box_l' }
          ]
        },
        { type: 'T3a', total: 10, b: 5, container: 'box_l', q: 'lv43/s5' },
        { type: 'T3a', total: 15, b: 5, container: 'box_l', q: 'lv43/s6' },
        { type: 'T3a', total: 20, b: 4, container: 'box_l', q: 'lv43/s7' },
        { type: 'T3a', total: 20, b: 5, container: 'box_l', q: 'lv43/s8' }
      ]
    },

    /* ---------------- 第 17 关 · L44 · D5 两种问法 ---------------- */
    44: {
      id: 44,
      name: 'Plates or Boxes',
      tier: 'D5',
      intro: {
        props: ['plate', 'plate', 'plate', 'box_m', 'basket'],
        lines: ['lv44/s0a', 'lv44/s0b']
      },
      demo: {
        type: 'T4a', a: 3, b: 4, total: 12, item: 'bun', container: 'plate',
        lines: ['lv44/s0c', 'lv44/s0d', 'lv44/s0e']
      },
      outro: {
        style: 'quad',
        cells: [
          { marks: ['plate', 'plate', 'plate'] },
          { marks: ['box_m', 'box_m', 'box_m'] },
          { marks: ['plate', 'plate', 'plate', 'plate'] },
          { marks: ['box_m', 'box_m', 'box_m', 'box_m'] }
        ],
        lines: ['lv44/out']
      },
      slots: [
        { type: 'T4a', a: 3, b: 4, total: 12, hand: 1, ask: 'share', q: 'lv44/s1' },
        { type: 'T3a', total: 12, b: 4, container: 'box_m', ask: 'box', q: 'lv44/s2' },
        { type: 'T4a', a: 4, b: 3, total: 12, ask: 'share', q: 'lv44/s3' },
        { type: 'T3a', total: 12, b: 3, container: 'box_m', ask: 'box', q: 'lv44/s4' },
        {
          type: 'T7b', answer: 0, q: 'lv44/s5',
          options: [
            { containers: 3, kind: 'box_m' },
            { containers: 4, kind: 'box_m' },
            { containers: 9, kind: 'box_m' }
          ]
        },
        { type: 'T3a', total: 10, b: 2, container: 'bag', ask: 'box', q: 'lv44/s6' },
        {
          type: 'T7b', answer: 1, q: 'lv44/s7',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [6] }]
        },
        { type: 'T4a', a: 4, b: 2, total: 8, ask: 'share', q: 'lv44/s8' }
      ]
    },

    /* ---------------- 第 18 关 · L45 · D5 混着来 ---------------- */
    45: {
      id: 45,
      name: 'Mixed Up',
      tier: 'D5',
      intro: {
        props: ['plate', 'box_m', 'bag', 'chirp'],
        lines: ['lv45/s0a', 'lv45/s0b']
      },
      demo: {
        type: 'T4a', a: 2, b: 4, total: 8, item: 'bun', container: 'plate',
        lines: ['lv45/s0c', 'lv45/s0d', 'lv45/s0e']
      },
      outro: { style: 'last', marks: ['plate', 'bag', 'plate', 'bag'], lines: ['lv45/out'] },
      slots: [
        { type: 'T4a', a: 3, b: 2, total: 6, hand: 1, ask: 'share', q: 'lv45/s1' },
        { type: 'T3a', total: 6, b: 2, container: 'bag', ask: 'box', q: 'lv45/s2' },
        { type: 'T4a', a: 4, b: 3, total: 12, ask: 'share', q: 'lv45/s3' },
        { type: 'T3a', total: 12, b: 3, container: 'bag', ask: 'box', q: 'lv45/s4' },
        {
          type: 'T7b', answer: 1, q: 'lv45/s5',
          options: [
            { containers: 3, kind: 'bag' },
            { containers: 4, kind: 'bag' },
            { containers: 9, kind: 'bag' }
          ]
        },
        { type: 'T3a', total: 15, b: 3, container: 'bag', ask: 'box', q: 'lv45/s6' },
        {
          type: 'T7b', answer: 0, q: 'lv45/s7',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [6] }]
        },
        { type: 'T4a', a: 2, b: 3, total: 6, ask: 'share', q: 'lv45/s8' }
      ]
    },

    /* ---------------- 第 19 关 · L46 · 综合·乘侧收口 ---------------- */
    46: {
      id: 46,
      name: 'Three Ways to Twelve',
      tier: 'X1',
      only8: true,
      intro: {
        props: ['plate', 'plate', 'plate', 'bo'],
        lines: ['lv46/s0a', 'lv46/s0b']
      },
      demo: {
        type: 'T1a', a: 3, b: 4, item: 'bun', container: 'plate',
        lines: ['lv46/s0c', 'lv46/s0d', 'lv46/s0e']
      },
      outro: { style: 'ring', lines: ['lv46/out', 'lv46/out2'], hold: 5000 },
      slots: [
        { type: 'T1a', a: 4, b: 3, q: 'lv46/s1' },
        { type: 'T1c', a: 3, b: 4, q: 'lv46/s2' },
        { type: 'T5', a: 3, b: 4, q: 'lv46/s3' },
        { type: 'T2', a: 5, b: 4, q: 'lv46/s4' },
        {
          type: 'T8', a: 4, b: 3, hide: 'total', answer: 2, q: 'lv46/s5',
          options: [{ groups: [7] }, { groups: [9] }, { groups: [12] }]
        },
        { type: 'serial', mode: 'T1->T4', a: 3, b: 3, q: 'lv46/s6' },
        {
          type: 'T7a', answer: 1, q: 'lv46/s7',
          options: [
            { containers: 6, kind: 'bundle5' },
            { containers: 10, kind: 'bundle5' },
            { containers: 8, kind: 'bundle5' }
          ]
        },
        { type: 'T4a', a: 4, b: 3, total: 12, q: 'lv46/s8' }
      ]
    },

    /* ---------------- 第 20 关 · L47 · 综合·除侧收口 ---------------- */
    47: {
      id: 47,
      name: 'Back and Forth',
      tier: 'X1',
      only8: true,
      intro: {
        props: ['plate', 'plate', 'plate', 'plate', 'chirp'],
        lines: ['lv47/s0a', 'lv47/s0b']
      },
      demo: {
        type: 'serial', mode: 'T4->T1', a: 4, b: 3, item: 'bun', container: 'plate',
        lines: ['lv47/s0c', 'lv47/s0d', 'lv47/s0e']
      },
      outro: { style: 'ring', lines: ['lv47/out', 'lv47/out2'], hold: 5000 },
      slots: [
        { type: 'T4a', a: 4, b: 5, total: 20, q: 'lv47/s1' },
        { type: 'T4a', a: 5, b: 4, total: 20, q: 'lv47/s2' },
        { type: 'T3a', total: 16, b: 4, container: 'box_m', q: 'lv47/s3' },
        { type: 'T3a', total: 20, b: 5, container: 'box_l', q: 'lv47/s4' },
        {
          type: 'T4b', a: 4, b: 3, total: 13, item: 'jar',
          askLeftover: true, judgeLeftover: false, q: 'lv47/s5'
        },
        {
          type: 'T7a', answer: 0, q: 'lv47/s6',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [6] }]
        },
        {
          type: 'T8', a: 4, b: 3, hide: 'total', answer: 1, q: 'lv47/s7',
          options: [{ groups: [12] }, { groups: [13] }, { groups: [14] }]
        },
        { type: 'serial', mode: 'T4->T1', a: 4, b: 3, q: 'lv47/s8' }
      ]
    },

    /* ---------------- 第 21 关 · L48 · 综合·辨别与互逆 ---------------- */
    48: {
      id: 48,
      name: 'Two Ways to Ask',
      tier: 'X1',
      only8: true,
      intro: {
        props: ['plate', 'box_m', 'bun', 'bo'],
        lines: ['lv48/s0a', 'lv48/s0b']
      },
      demo: {
        type: 'T7a', answer: 0,
        options: [
          { groups: [4, 4, 4] },
          { groups: [3, 3, 3, 3] },
          { groups: [3, 3, 3] }
        ],
        lines: ['lv48/s0c', 'lv48/s0d', 'lv48/s0e']
      },
      outro: {
        style: 'quad',
        cells: [
          { marks: ['plate', 'plate', 'plate'] },
          { marks: ['box_m', 'box_m', 'box_m'] },
          { marks: ['plate', 'plate', 'plate', 'plate'] },
          { marks: ['bag', 'bag', 'bag', 'bag'] }
        ],
        lines: ['lv48/out', 'lv48/out2'], hold: 5000
      },
      slots: [
        { type: 'T4a', a: 3, b: 4, total: 12, ask: 'share', q: 'lv48/s1' },
        { type: 'T3a', total: 12, b: 4, container: 'box_m', ask: 'box', q: 'lv48/s2' },
        { type: 'T4a', a: 4, b: 3, total: 12, ask: 'share', q: 'lv48/s3' },
        { type: 'T3a', total: 12, b: 3, container: 'bag', ask: 'box', q: 'lv48/s4' },
        {
          type: 'T7b', answer: 0, q: 'lv48/s5',
          options: [
            { containers: 3, kind: 'box_m' },
            { containers: 4, kind: 'box_m' },
            { containers: 9, kind: 'box_m' }
          ]
        },
        { type: 'serial', mode: 'T1->T4', a: 3, b: 4, q: 'lv48/s6' },
        {
          type: 'T7b', answer: 1, q: 'lv48/s7',
          options: [{ groups: [3] }, { groups: [4] }, { groups: [6] }]
        },
        { type: 'T3a', total: 8, b: 2, container: 'bag', ask: 'box', q: 'lv48/s8' }
      ]
    }
  };

  /* ============================================================
     构建期断言：不合法就 throw，产物不生成
     ============================================================ */

  var BUILD_TYPES = { T1a: 1, T1b: 1, T1c: 1, T2: 1, T3a: 1, T4a: 1, T4b: 1, T4d: 1, serial: 1 };
  var JUDGE_TYPES = { T5: 1, T6: 1, T7a: 1, T7b: 1, T7c: 1, T8: 1 };

  function validate(opts) {
    opts = opts || {};
    var K = global.CDKit;
    var problems = [];
    var warnings = [];

    function fail(msg) {
      problems.push(msg);
    }

    Object.keys(C).filter(function (k) { return /^\d+$/.test(k); }).forEach(function (key) {
      var lv = C[key];
      var id = lv.id;
      var slots = lv.slots || [];
      var need = lv.only8 ? 8 : 8;

      if (slots.length < need) fail('L' + id + ' 槽数不足：' + slots.length + ' < ' + need);

      // 末槽必须是建模型或动作型（6 槽看 S6，8 槽看 S8）
      // 综合关 L46–L48 恒 8 槽，没有 6 槽版，跳过 S6 判定
      var last6 = slots[5];
      var last8 = slots[7];
      if (!lv.only8 && last6 && JUDGE_TYPES[last6.type] && last6.type !== 'T4b') {
        fail('L' + id + ' 6 槽版末槽是判断型：' + last6.type);
      }
      if (last8 && JUDGE_TYPES[last8.type] && last8.type !== 'T4b') {
        fail('L' + id + ' 8 槽版末槽是判断型：' + last8.type);
      }

      // 相邻两槽同型判断：策划案 §2.11 规则 6 的通则，但 §3 逐关表里 L29 S1/S2
      // 与 L39 S4/S5 是有意为之（文档内已写明理由），以逐关表为准 → 仅告警
      for (var i = 1; i < slots.length; i += 1) {
        var p = slots[i - 1], q = slots[i];
        if (JUDGE_TYPES[p.type] && p.type === q.type && p.type !== 'T5') {
          warnings.push('L' + id + ' S' + i + '/S' + (i + 1) + ' 相邻同型判断槽：' + p.type + '（逐关表有意为之）');
        }
      }

      // D5 分级收紧（分人槽卡 a，装盒槽卡 b）
      var tier = lv.tier;

      slots.forEach(function (s, si) {
        var where = 'L' + id + ' S' + (si + 1) + ' ' + s.type;
        try {
          if (s.type === 'T4a' || s.type === 'T4b' || s.type === 'T4d') {
            var a = s.type === 'T4d' ? s.dist.length : s.a;
            var b = s.type === 'T4d' ? Math.max.apply(null, s.dist) : s.b;
            if (s.type === 'T4b') {
              K.valid(a, b, where, { remainderOne: true, tier: tier === 'D5' ? 'D5' : '', isShare: true });
              if (s.total !== a * b + 1) fail(where + ' T4b 总数必须 = a*b+1，实为 ' + s.total);
            } else {
              K.valid(a, b, where, { tier: tier === 'D5' ? 'D5' : '', isShare: true });
              if (s.total != null && s.total !== a * b) fail(where + ' 总数 ≠ a*b：' + s.total + ' vs ' + (a * b));
            }
          } else if (s.type === 'T1a' || s.type === 'T1c') {
            K.valid(s.a, s.b, where, { tier: tier === 'D5' ? 'D5' : '', isShare: true });
          } else if (s.type === 'T3a') {
            var boxes = s.total / s.b;
            if (!Number.isInteger(boxes)) fail(where + ' 装不完：' + s.total + ' / ' + s.b);
            K.valid(boxes, s.b, where, { tier: tier === 'D5' ? 'D5' : '', isShare: false });
          } else if (s.type === 'T2') {
            K.valid(s.a, s.b, where, { m3: true });
            if (s.a * s.b > 100) fail(where + ' T2 累计超过 100');
          } else if (s.type === 'serial') {
            K.valid(s.a, s.b, where, {});
            if (s.a + s.b > K.limits.serialSteps) fail(where + ' 串联步数 ' + (s.a + s.b) + ' > 8');
          } else if (s.type === 'T5') {
            K.valid(s.a, s.b, where, {});
          } else if (s.type === 'T8') {
            K.valid(s.a, s.b, where, {});
            if (!s.options || s.options.length < 2) fail(where + ' 缺少选项');
            if (!(s.answer >= 0 && s.answer < (s.options || []).length)) fail(where + ' answer 越界');
          } else if (s.type === 'T7a' || s.type === 'T7b' || s.type === 'T6') {
            if (!s.options || s.options.length !== 3) fail(where + ' 必须三选一');
            if (!(s.answer >= 0 && s.answer < 3)) fail(where + ' answer 越界');
            // 同一对里两题答案必须不同（D5 通则）：同总数 a=b 不可用于 D5
            if (s.type === 'T7b' && s.options.every(function (o) { return o.groups && o.groups.length === 1; })) {
              var vals = s.options.map(function (o) { return o.groups[0]; });
              if (new Set(vals).size !== vals.length) fail(where + ' 选项数值重复');
            }
          } else if (s.type === 'T7c') {
            if (!s.groups || s.groups.length < 2) fail(where + ' T7c 至少两组');
          } else if (JUDGE_TYPES[s.type]) {
            fail(where + ' 未覆盖的题型校验');
          } else {
            fail(where + ' 未知题型');
          }
        } catch (e) {
          fail(where + ' · ' + e.message);
        }
      });

      // 每关必须有一个「空容器」槽（从零建，不给示范残留）
      // T1a/T1c/T3a/T4a/T4b 起手容器恒为空（「一起做」只是代劳头几轮，容器仍从空开始）
      var hasEmpty = slots.some(function (s) {
        return s.type === 'T1a' || s.type === 'T1c' || s.type === 'T3a' ||
          s.type === 'T4a' || s.type === 'T4b';
      });
      if (!hasEmpty) warnings.push('L' + id + ' 未见空容器槽');

      // 每关至少一个「换数字」槽：同题型 + 同容器 + 同实物，参数换了一个数字
      var fam = {};
      var hasSwap = false;
      slots.forEach(function (s) {
        if (!BUILD_TYPES[s.type] || s.type === 'serial' || s.type === 'T4d') return;
        var a = s.type === 'T3a' ? s.total : (s.type === 'T4b' ? s.total : s.a);
        if (a == null) return;
        var sigFam = [s.type, s.container || '', s.item || ''].join('|');
        if (!fam[sigFam]) fam[sigFam] = [];
        fam[sigFam].push(a + 'x' + s.b);
      });
      Object.keys(fam).forEach(function (k) {
        if (new Set(fam[k]).size >= 2) hasSwap = true;
      });
      // 综合关（L46–L48）不再要求「换数字」，它们本身就是全段事实的复用
      if (!hasSwap && !lv.only8) warnings.push('L' + id + ' 未见同结构换数字槽');
    });

    if (opts.throw && problems.length) {
      throw new Error('乘除段数据校验失败（' + problems.length + ' 项）：\n' + problems.join('\n'));
    }
    return { problems: problems, warnings: warnings, levels: Object.keys(C).length };
  }

  C.validate = validate;
  C.ids = Object.keys(C)
    .filter(function (k) { return /^\d+$/.test(k); })
    .map(Number)
    .sort(function (a, b) { return a - b; });

  global.CD_DATA = C;

  // 开发期：?cdcheck=1 直接在控制台抛出
  if (typeof location !== 'undefined' && /[?&]cdcheck=1/.test(location.search)) {
    var r = validate({ throw: true });
    if (global.console) {
      console.info('[cd] 数据校验通过：' + r.levels + ' 关 / ' + r.warnings.length + ' 条提示');
      r.warnings.forEach(function (w) { console.info('[cd] 提示 ' + w); });
    }
  }
})(window);
