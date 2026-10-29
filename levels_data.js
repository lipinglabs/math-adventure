/* ============================================================
   levels_data.js · 关卡与地图配置（纯数据，不含逻辑）
   ------------------------------------------------------------
   一个关卡 = 地图坐标 + 素材清单 + 题目数据。
   新增关卡只需在本文件追加条目并补 voice/<lv>/ 下的音频，
   不得为了加关卡去改 engine.js 或 app.js。

   坐标系统：与 index.html 里 <svg viewBox="0 0 390 620"> 完全一致，
   单位是 SVG 用户单位，由 app.js 换算成百分比定位。

   语言铁律：name / 题面一律英文，禁止中文字符（PROJECT_MATH_RULES §5.5）。
   ============================================================ */

window.MATH_DATA = {
  meta: {
    title: 'Math Adventure',
    version: '0.3.0',
    // 音频根目录。页面运行时按关拼路径，只请求当前关用到的文件。
    audioBase: 'voice/'
  },

  map: {
    viewBox: { w: 390, h: 620 },
    // 节点中心纵向间距 104 单位（实测 390×844 下 = 127px），横向左右交替。
    // 最低点必须保证「圆盘 + 标签」不压到 .map-note（labelBottom = 76 + y×1.223 + 60 ≤ 768）。
    // 改坐标时必须同步改 index.html 里的三条轨迹 path。
    spots: [
      { level: 1, x: 128, y: 514 },
      { level: 2, x: 214, y: 410 },
      { level: 3, x: 132, y: 306 },
      { level: 4, x: 226, y: 202 },
      { level: 5, x: 140, y: 98 }
    ]
  },

  levels: {
    1: {
      id: 1,
      name: 'Apple Addition',
      status: 'ready',
      // 本关全部素材（相对 meta.audioBase）。只加载这一组，别的一律不碰。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',

          'lv01/t1_a.mp3',
          'lv01/t1_b.mp3',
          'lv01/t1_c.mp3',
          'lv01/t1_d.mp3',
          'lv01/t2_a.mp3',
          'lv01/t2_b.mp3',
          'lv01/t2_c.mp3',
          'lv01/t2_d.mp3',
          'lv01/t3_a.mp3',

          'lv01/q1.mp3',
          'lv01/q2.mp3',
          'lv01/q3.mp3',
          'lv01/q4.mp3',
          'lv01/q5.mp3',
          'lv01/q6.mp3',
          'lv01/q7.mp3',
          'lv01/q8.mp3',
          'lv01/q9.mp3',
          'lv01/q10.mp3'
        ],
        images: []
      },
      // 10 题：两个加数都 ≥ 1，和 ≤ 5，正好覆盖全部有序组合
      // object 决定 SVG 实物；题干语音 key 为 q<index+1>
      questions: [
        { a: 1, b: 1, object: 'apple' },
        { a: 1, b: 2, object: 'balloon' },
        { a: 2, b: 1, object: 'fish' },
        { a: 1, b: 3, object: 'apple' },
        { a: 3, b: 1, object: 'star' },
        { a: 2, b: 2, object: 'balloon' },
        { a: 1, b: 4, object: 'fish' },
        { a: 4, b: 1, object: 'star' },
        { a: 2, b: 3, object: 'apple' },
        { a: 3, b: 2, object: 'balloon' }
      ]
    },

    2: {
      id: 2,
      name: 'Balloon Take Away',
      status: 'ready',
      // 每题 4 个选项（全局铁律），干扰项优先取离答案最近的数
      optionCount: 4,
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',

          'lv02/t1_a.mp3',
          'lv02/t1_b.mp3',
          'lv02/t1_q.mp3',
          'lv02/t1_c.mp3',
          'lv02/t2_a.mp3',
          'lv02/t2_b.mp3',
          'lv02/t2_c.mp3',
          'lv02/t3_a.mp3',
          'lv02/t3_b.mp3',

          'lv02/q1.mp3',
          'lv02/q2.mp3',
          'lv02/q3.mp3',
          'lv02/q4.mp3',
          'lv02/q5.mp3',
          'lv02/q6.mp3',
          'lv02/q7.mp3',
          'lv02/q8.mp3',
          'lv02/q9.mp3',
          'lv02/q10.mp3'
        ],
        images: []
      },
      // 9 以内减法：被减数 3–9、减数 1–6，结果均 ≥ 1
      // voice 表示该题固定的题干音频；题目顺序在运行时打乱
      questions: [
        { a: 3, b: 1, object: 'balloon', voice: 'q1' },
        { a: 5, b: 2, object: 'balloon', voice: 'q2' },
        { a: 6, b: 1, object: 'balloon', voice: 'q3' },
        { a: 7, b: 4, object: 'balloon', voice: 'q4' },
        { a: 8, b: 3, object: 'balloon', voice: 'q5' },
        { a: 9, b: 2, object: 'balloon', voice: 'q6' },
        { a: 4, b: 3, object: 'balloon', voice: 'q7' },
        { a: 9, b: 5, object: 'balloon', voice: 'q8' },
        { a: 8, b: 6, object: 'balloon', voice: 'q9' },
        { a: 7, b: 1, object: 'balloon', voice: 'q10' }
      ]
    },

    3: {
      id: 3,
      name: 'Orchard Harvest',
      status: 'ready',
      // 三种题型的选项数由题型决定（§6.5）：sign = 2、sentence = 3、number = 3
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',

          'lv03/t1_a.mp3',
          'lv03/t1_b.mp3',
          'lv03/t1_c.mp3',
          'lv03/t2_a.mp3',
          'lv03/t2_b.mp3',
          'lv03/t2_c.mp3',
          'lv03/t3_a.mp3',
          'lv03/t3_b.mp3',

          'lv03/a1_q.mp3', 'lv03/a1_r.mp3',
          'lv03/a2_q.mp3', 'lv03/a2_r.mp3',
          'lv03/a3_q.mp3', 'lv03/a3_r.mp3',
          'lv03/a4_q.mp3', 'lv03/a4_r.mp3',

          'lv03/b1_q.mp3',
          'lv03/b2_q.mp3',
          'lv03/b3_q.mp3',

          'lv03/c1_q.mp3',
          'lv03/c2_q.mp3',
          'lv03/c3_q.mp3'
        ],
        images: []
      },
      // 10 以内加减混合：4 题点符号 + 3 题点算式 + 3 题点结果，顺序每局打乱。
      // op 为题目本身的运算；answerVoice 只用于 sign 题（点对后播算式）。
      questions: [
        { type: 'sign', a: 4, b: 3, op: '+', object: 'dog', voice: 'a1_q', answerVoice: 'a1_r' },
        { type: 'sign', a: 6, b: 2, op: '-', object: 'bird', voice: 'a2_q', answerVoice: 'a2_r' },
        { type: 'sign', a: 5, b: 4, op: '+', object: 'rabbit', voice: 'a3_q', answerVoice: 'a3_r' },
        { type: 'sign', a: 7, b: 3, op: '-', object: 'fish', voice: 'a4_q', answerVoice: 'a4_r' },

        { type: 'sentence', a: 5, b: 2, op: '-', object: 'balloon', voice: 'b1_q' },
        { type: 'sentence', a: 4, b: 3, op: '+', object: 'bird', voice: 'b2_q' },
        { type: 'sentence', a: 6, b: 4, op: '-', object: 'apple', voice: 'b3_q' },

        { type: 'number', a: 8, b: 3, op: '-', object: 'apple', voice: 'c1_q' },
        { type: 'number', a: 5, b: 4, op: '+', object: 'apple', voice: 'c2_q' },
        { type: 'number', a: 6, b: 2, op: '+', object: 'apple', voice: 'c3_q' }
      ]
    },

    4: {
      id: 4,
      name: 'Ten and Some More',
      status: 'ready',
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',

          'lv04/t1_a.mp3',
          'lv04/t1_b.mp3',
          'lv04/t2_a.mp3',
          'lv04/t2_b.mp3',
          'lv04/t3_a.mp3',
          'lv04/t3_b.mp3',

          'lv04/a1_q.mp3',
          'lv04/a2_q.mp3',
          'lv04/a3_q.mp3',
          'lv04/a4_q.mp3',

          'lv04/b1_q.mp3',
          'lv04/b2_q.mp3',
          'lv04/b3_q.mp3',

          'lv04/c1_q.mp3',
          'lv04/c2_q.mp3',
          'lv04/c3_q.mp3'
        ],
        images: []
      },
      // 11–19 与十格阵：4 题看阵点数字 + 3 题听数字选阵 + 3 题拖拽凑数。
      // 十格阵一律 2 行 × 5 列；ones 表示零散苹果数，target 表示目标数。
      questions: [
        { type: 'count', ones: 4, voice: 'a1_q' },
        { type: 'count', ones: 7, voice: 'a2_q' },
        { type: 'count', ones: 2, voice: 'a3_q' },
        { type: 'count', ones: 9, voice: 'a4_q' },

        { type: 'pick', target: 15, options: [12, 15, 18], voice: 'b1_q' },
        { type: 'pick', target: 12, options: [12, 14, 17], voice: 'b2_q' },
        { type: 'pick', target: 18, options: [13, 16, 18], voice: 'b3_q' },

        { type: 'build', target: 15, voice: 'c1_q' },
        { type: 'build', target: 13, voice: 'c2_q' },
        { type: 'build', target: 17, voice: 'c3_q' }
      ]
    },

    5: {
      id: 5,
      name: 'Cookie Party',
      status: 'ready',
      // 三种题型的选项数（§6.5）：give 是拖拽题、无选项；count = 3 个数字键；pick = 3 张动物卡。
      // target = 要给的饼干总数，ones = 盒子外零散数（count/pick 用到）。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',

          'lv05/t1_a.mp3',
          'lv05/t1_b.mp3',
          'lv05/t2_a.mp3',
          'lv05/t2_q.mp3',
          'lv05/t2_b.mp3',
          'lv05/t3_a.mp3',
          'lv05/t3_b.mp3',

          'lv05/a1_q.mp3',
          'lv05/a2_q.mp3',
          'lv05/a3_q.mp3',
          'lv05/a4_q.mp3',

          'lv05/b1_q.mp3',
          'lv05/b2_q.mp3',
          'lv05/b3_q.mp3',

          'lv05/c1_q.mp3',
          'lv05/c2_q.mp3',
          'lv05/c3_q.mp3'
        ],
        images: []
      },
      // 11–19 与「一盒十块 + 零散」：4 题听数字拖饼干 + 3 题看盒点数字 + 3 题选小动物。
      // pick 题的 options 里必须有一项 ones 等于本题 ones（答案），三项 ones 互不相同。
      questions: [
        { type: 'give', target: 16, animal: 'bear', voice: 'a1_q' },
        { type: 'give', target: 13, animal: 'puppy', voice: 'a2_q' },
        { type: 'give', target: 18, animal: 'cat', voice: 'a3_q' },
        { type: 'give', target: 12, animal: 'rabbit', voice: 'a4_q' },

        { type: 'count', ones: 6, animal: 'bear', voice: 'b1_q' },
        { type: 'count', ones: 8, animal: 'cat', voice: 'b2_q' },
        { type: 'count', ones: 5, animal: 'puppy', voice: 'b3_q' },

        {
          type: 'pick', ones: 4, animal: 'bear', voice: 'c1_q',
          options: [{ animal: 'bear', ones: 4 }, { animal: 'puppy', ones: 6 }, { animal: 'cat', ones: 8 }]
        },
        {
          type: 'pick', ones: 7, animal: 'puppy', voice: 'c2_q',
          options: [{ animal: 'bear', ones: 5 }, { animal: 'puppy', ones: 7 }, { animal: 'cat', ones: 9 }]
        },
        {
          type: 'pick', ones: 6, animal: 'cat', voice: 'c3_q',
          options: [{ animal: 'bear', ones: 8 }, { animal: 'puppy', ones: 3 }, { animal: 'cat', ones: 6 }]
        }
      ]
    }
  }
};
