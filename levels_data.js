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

    // 分 5 大阶段（与 docs/CURRICULUM.md 的阶段划分一致）。
    // 一屏只渲染一个阶段；阶段内节点超过 pageSize 时自动均分成多页，左右滑动切换。
    // 只渲染 levels 里已存在的关卡，因此后面几阶段在关卡做出来之前是空的（按钮自动跳过）。
    pageSize: 6,
    stages: [
      { id: 1, from: 1, to: 3 },
      { id: 2, from: 4, to: 15 },
      { id: 3, from: 16, to: 27 },
      { id: 4, from: 28, to: 39 },
      { id: 5, from: 40, to: 48 }
    ],

    // 页内节点坐标模板（SVG 单位，viewBox 390×620）。app.js 按页内节点数在这条竖向区间里均分。
    // canvas 在 CSS 里已让出顶部 46px、底部 140px（底部导航条 + 提示条），所以这里铺满 0–620 即可。
    // maxStepPx：相邻节点的最大像素间距，避免一页只有 2–3 个节点时被拉得过于稀疏。
    layout: {
      x: [122, 214],
      top: 0,
      bottom: 620,
      maxStepPx: 118
    }
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
    },

    6: {
      id: 6,
      name: 'Number Link',
      status: 'ready',
      // 三种题型（§6.5）：link 是连线题（左右各 3 张卡，没有按钮选项）；fill 是 3 个数字键。
      // left = 'num' 表示数字在左、图案在右；nums 与 ones 各自独立洗牌，答案位置每局都变。
      // link 题的 nums / ones 必须互相对应（10 + ones 落在 nums 里），且三对都能配平。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',

          'lv06/t1_a.mp3',
          'lv06/t1_b.mp3',
          'lv06/t2_a.mp3',

          'lv06/a1_q.mp3',
          'lv06/a2_q.mp3',
          'lv06/a3_q.mp3',
          'lv06/a4_q.mp3',

          'lv06/b1_a.mp3',
          'lv06/b2_a.mp3',
          'lv06/b3_a.mp3',
          'lv06/link_right.mp3',

          'lv06/c1_a.mp3',
          'lv06/c2_a.mp3',
          'lv06/c3_a.mp3',
          'lv06/how_many.mp3',
          'lv06/touch_num.mp3'
        ],
        images: []
      },
      // 11–19 半抽象匹配：4 题数字找图案 + 3 题图案找数字 + 3 题看图选数字。
      // voice 是数组：题干可能由多条语音接起来（先描述图案，再说“连到右边的数字”）。
      questions: [
        { type: 'link', left: 'num', target: 14, nums: [14, 18, 12], ones: [4, 8, 2], voice: ['a1_q'] },
        { type: 'link', left: 'num', target: 18, nums: [16, 18, 13], ones: [8, 6, 3], voice: ['a2_q'] },
        { type: 'link', left: 'num', target: 12, nums: [12, 15, 19], ones: [2, 5, 9], voice: ['a3_q'] },
        { type: 'link', left: 'num', target: 16, nums: [17, 16, 11], ones: [1, 6, 7], voice: ['a4_q'] },

        { type: 'link', left: 'pic', target: 17, nums: [17, 13, 19], ones: [7, 3, 9], voice: ['b1_a', 'link_right'] },
        { type: 'link', left: 'pic', target: 15, nums: [12, 18, 15], ones: [5, 8, 2], voice: ['b2_a', 'link_right'] },
        { type: 'link', left: 'pic', target: 19, nums: [16, 19, 14], ones: [9, 6, 4], voice: ['b3_a', 'link_right'] },

        { type: 'fill', ones: 9, options: [19, 18, 16], voice: ['c1_a', 'how_many', 'touch_num'] },
        { type: 'fill', ones: 6, options: [16, 18, 14], voice: ['c2_a', 'how_many', 'touch_num'] },
        { type: 'fill', ones: 8, options: [18, 16, 19], voice: ['c3_a', 'how_many', 'touch_num'] }
      ]
    },

    7: {
      id: 7,
      name: 'Block Build',
      status: 'ready',
      // 三种题型（§6.5）：count = 3 个数字键；pick = 3 组积木卡；solve = 3 个可拖拽的数字键。
      // 一律不进位：个位相加 ≤ 9，十位始终是「一捆 10 块」不动。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv07/t1_a.mp3',
          'lv07/t1_b.mp3',
          'lv07/t2_a.mp3',
          'lv07/t2_b.mp3',
          'lv07/t2_c.mp3',
          'lv07/t3_a.mp3',
          'lv07/t3_b.mp3',
          'lv07/a1_a.mp3',
          'lv07/a1_b.mp3',
          'lv07/a2_a.mp3',
          'lv07/a2_b.mp3',
          'lv07/a3_a.mp3',
          'lv07/a3_b.mp3',
          'lv07/a4_a.mp3',
          'lv07/how_many.mp3',
          'lv07/b1_q.mp3',
          'lv07/b2_q.mp3',
          'lv07/b3_q.mp3',
          'lv07/c1_q.mp3',
          'lv07/c2_q.mp3',
          'lv07/c3_q.mp3',
          'lv07/put_num.mp3'
        ],
        images: []
      },
      // ones = 已有零散块数，add = 又飞来的块数；options 三选一，答案 = 10 + ones + add。
      // pick 题的 combos 是三组「10 + n」，target 是听到的那个 n；solve 题答案 = a + b。
      questions: [
        { type: 'count', ones: 4, add: 2, options: [15, 16, 18], voice: ['a1_a', 'a1_b', 'how_many'] },
        { type: 'count', ones: 2, add: 3, options: [13, 15, 18], voice: ['a2_a', 'a2_b', 'how_many'] },
        { type: 'count', ones: 3, add: 5, options: [16, 18, 19], voice: ['a3_a', 'a3_b', 'how_many'] },
        { type: 'count', ones: 6, add: 3, options: [17, 18, 19], voice: ['a4_a', 'a2_b', 'how_many'] },

        { type: 'pick', target: 12, combos: [2, 5, 8], voice: ['b1_q'] },
        { type: 'pick', target: 16, combos: [4, 6, 9], voice: ['b2_q'] },
        { type: 'pick', target: 17, combos: [3, 7, 8], voice: ['b3_q'] },

        { type: 'solve', a: 13, b: 4, options: [16, 17, 18], voice: ['c1_q', 'put_num'] },
        { type: 'solve', a: 12, b: 6, options: [17, 18, 19], voice: ['c2_q', 'put_num'] },
        { type: 'solve', a: 14, b: 5, options: [18, 19, 17], voice: ['c3_q', 'put_num'] }
      ]
    },

    8: {
      id: 8,
      name: 'Car Garage',
      status: 'ready',
      // 三种题型（§6.5）：drag = 3 个数字键（先拖车）；pick = 3 张车库卡；touch = 3 个数字键。
      // 一律不进位：个位相加 ≤ 9，十位车库永远是停满的 10 辆。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv08/t1_a.mp3',
          'lv08/t1_b.mp3',
          'lv08/t1_c.mp3',
          'lv08/t2_a.mp3',
          'lv08/t2_b.mp3',
          'lv08/t2_c.mp3',
          'lv08/t3_a.mp3',
          'lv08/t3_b.mp3',
          'lv08/a1_a.mp3',
          'lv08/a1_b.mp3',
          'lv08/a2_a.mp3',
          'lv08/a2_b.mp3',
          'lv08/a3_a.mp3',
          'lv08/a3_b.mp3',
          'lv08/a4_a.mp3',
          'lv08/how_many.mp3',
          'lv08/b1_q.mp3',
          'lv08/b2_q.mp3',
          'lv08/b3_q.mp3',
          'lv08/c1_q.mp3',
          'lv08/c2_q.mp3',
          'lv08/c3_q.mp3'
        ],
        images: []
      },
      // drag：ones = 个位车库已有辆数，add = 车道上要拖进去的辆数，答案 = 10 + ones + add。
      // pick：a = 个位车库停着几辆，b = 车道上有几辆（题干念 10 + a 再加 b），三张卡的 (a, b) 互不相同。
      // touch：a + b，三选一。
      questions: [
        { type: 'drag', ones: 3, add: 2, options: [14, 15, 16], voice: ['a1_a', 'a1_b', 'how_many'] },
        { type: 'drag', ones: 4, add: 3, options: [16, 17, 18], voice: ['a2_a', 'a2_b', 'how_many'] },
        { type: 'drag', ones: 1, add: 5, options: [15, 16, 17], voice: ['a3_a', 'a3_b', 'how_many'] },
        { type: 'drag', ones: 6, add: 2, options: [17, 18, 19], voice: ['a4_a', 'a1_b', 'how_many'] },

        { type: 'pick', a: 2, b: 3, voice: ['b1_q'], options: [{ a: 2, b: 3 }, { a: 1, b: 3 }, { a: 2, b: 4 }] },
        { type: 'pick', a: 3, b: 4, voice: ['b2_q'], options: [{ a: 3, b: 4 }, { a: 3, b: 3 }, { a: 2, b: 4 }] },
        { type: 'pick', a: 1, b: 5, voice: ['b3_q'], options: [{ a: 1, b: 5 }, { a: 1, b: 4 }, { a: 2, b: 5 }] },

        { type: 'touch', a: 14, b: 3, options: [16, 17, 18], voice: ['c1_q'] },
        { type: 'touch', a: 12, b: 6, options: [17, 18, 19], voice: ['c2_q'] },
        { type: 'touch', a: 15, b: 4, options: [18, 19, 17], voice: ['c3_q'] }
      ]
    },

    9: {
      id: 9,
      name: 'Quick Tap',
      status: 'ready',
      // 三种题型（§6.5）：tap = 3 个数字键；wrong = 3 个算式卡；flash = 3 个数字键 + 5 秒倒计时。
      // 一律不进位：个位相加 ≤ 9。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv09/t1_a.mp3',
          'lv09/t1_b.mp3',
          'lv09/t2_a.mp3',
          'lv09/t2_b.mp3',
          'lv09/a1_q.mp3',
          'lv09/a2_q.mp3',
          'lv09/a3_q.mp3',
          'lv09/a4_q.mp3',
          'lv09/find_wrong.mp3',
          'lv09/c1_q.mp3',
          'lv09/c2_q.mp3',
          'lv09/c3_q.mp3'
        ],
        images: []
      },
      // tap：a + b，三选一。
      // wrong：三个算式里恰好一个 a + b ≠ shown，孩子要把它找出来。
      // flash：5 秒倒计时，超时或点错都原地重做（进度条重置）。
      questions: [
        { type: 'tap', a: 14, b: 3, options: [16, 17, 18], voice: ['a1_q'] },
        { type: 'tap', a: 11, b: 5, options: [15, 16, 17], voice: ['a2_q'] },
        { type: 'tap', a: 13, b: 5, options: [17, 18, 19], voice: ['a3_q'] },
        { type: 'tap', a: 12, b: 7, options: [18, 19, 17], voice: ['a4_q'] },

        { type: 'wrong', voice: ['find_wrong'], sentences: [{ a: 11, b: 3, shown: 14 }, { a: 12, b: 5, shown: 17 }, { a: 13, b: 4, shown: 16 }] },
        { type: 'wrong', voice: ['find_wrong'], sentences: [{ a: 11, b: 7, shown: 18 }, { a: 14, b: 3, shown: 18 }, { a: 12, b: 5, shown: 17 }] },
        { type: 'wrong', voice: ['find_wrong'], sentences: [{ a: 13, b: 6, shown: 19 }, { a: 12, b: 6, shown: 19 }, { a: 11, b: 5, shown: 16 }] },

        { type: 'flash', a: 11, b: 6, options: [16, 17, 18], voice: ['c1_q'] },
        { type: 'flash', a: 13, b: 6, options: [18, 19, 17], voice: ['c2_q'] },
        { type: 'flash', a: 14, b: 4, options: [17, 18, 19], voice: ['c3_q'] }
      ]
    },

    10: {
      id: 10,
      name: 'Bird Branch',
      status: 'ready',
      // 三种题型（§6.5）：fly = 3 个数字键；branch = 3 张树枝卡；take = 点掉鸟后 3 个数字键。
      // 一律不退位：只从个位树枝上减，个位够减（a - 10 >= b）。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv10/t1_a.mp3',
          'lv10/t2_a.mp3',
          'lv10/t2_b.mp3',
          'lv10/t2_c.mp3',
          'lv10/t3_a.mp3',
          'lv10/t3_b.mp3',
          'lv10/a1_a.mp3',
          'lv10/a2_a.mp3',
          'lv10/a3_a.mp3',
          'lv10/a4_a.mp3',
          'lv10/how_many.mp3',
          'lv10/b1_q.mp3',
          'lv10/b2_q.mp3',
          'lv10/b3_q.mp3',
          'lv10/c1_q.mp3',
          'lv10/c2_q.mp3',
          'lv10/c3_q.mp3'
        ],
        images: []
      },
      // fly：a 只鸟里飞走 b 只，答案 = a - b；voice 只念情境，问句 how_many 由关卡模块在飞完后补。
      // branch：target 是听到的总数，combos 是三根树枝的零散只数（10 + n）。
      // take：点掉 b 只鸟，再点剩下的只数。
      questions: [
        { type: 'fly', a: 16, b: 4, options: [12, 13, 14], voice: ['a1_a'] },
        { type: 'fly', a: 17, b: 5, options: [11, 12, 13], voice: ['a2_a'] },
        { type: 'fly', a: 18, b: 3, options: [14, 15, 16], voice: ['a3_a'] },
        { type: 'fly', a: 15, b: 4, options: [10, 11, 12], voice: ['a4_a'] },

        { type: 'branch', target: 18, combos: [7, 8, 5], voice: ['b1_q'] },
        { type: 'branch', target: 16, combos: [6, 4, 9], voice: ['b2_q'] },
        { type: 'branch', target: 13, combos: [3, 7, 5], voice: ['b3_q'] },

        { type: 'take', a: 19, b: 6, options: [11, 13, 14], voice: ['c1_q'] },
        { type: 'take', a: 17, b: 4, options: [12, 13, 15], voice: ['c2_q'] },
        { type: 'take', a: 18, b: 7, options: [10, 11, 12], voice: ['c3_q'] }
      ]
    },
    11: {
      id: 11,
      name: 'Candy Share',
      status: 'ready',
      // 三种题型（§6.5）：take = 3 个数字键（先拖糖）；group = 3 张糖果卡；wrong = 3 句算式。
      // 一律不退位：只从零散的个位糖里减，个位够减（a - 10 >= b）。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv11/t1_a.mp3',
          'lv11/t2_a.mp3',
          'lv11/t2_b.mp3',
          'lv11/t2_c.mp3',
          'lv11/t3_a.mp3',
          'lv11/t3_b.mp3',
          'lv11/a1_a.mp3',
          'lv11/a2_a.mp3',
          'lv11/a3_a.mp3',
          'lv11/a4_a.mp3',
          'lv11/how_many.mp3',
          'lv11/b1_q.mp3',
          'lv11/b2_q.mp3',
          'lv11/b3_q.mp3',
          'lv11/find_wrong.mp3'
        ],
        images: []
      },
      // take：一盒十颗 + (a-10) 颗零散，拖走 b 颗到盘里，答案 = a - b；
      //       语音只念情境与动作，问句 how_many 由关卡模块在拖完后补。
      // group：target 是听到的总数，combos 是三组零散颗数（10 + n）。
      // wrong：三句里恰好一句 a - b ≠ shown，孩子要把它找出来。
      questions: [
        { type: 'take', a: 17, b: 4, options: [12, 13, 14], voice: ['a1_a'] },
        { type: 'take', a: 18, b: 5, options: [12, 13, 15], voice: ['a2_a'] },
        { type: 'take', a: 16, b: 2, options: [13, 14, 15], voice: ['a3_a'] },
        { type: 'take', a: 19, b: 4, options: [14, 15, 16], voice: ['a4_a'] },

        { type: 'group', target: 16, combos: [8, 6, 5], voice: ['b1_q'] },
        { type: 'group', target: 18, combos: [8, 7, 6], voice: ['b2_q'] },
        { type: 'group', target: 14, combos: [5, 4, 6], voice: ['b3_q'] },

        { type: 'wrong', voice: ['find_wrong'], sentences: [{ a: 15, b: 3, shown: 12 }, { a: 16, b: 4, shown: 11 }, { a: 14, b: 2, shown: 12 }] },
        { type: 'wrong', voice: ['find_wrong'], sentences: [{ a: 17, b: 5, shown: 12 }, { a: 13, b: 2, shown: 10 }, { a: 18, b: 6, shown: 12 }] },
        { type: 'wrong', voice: ['find_wrong'], sentences: [{ a: 19, b: 7, shown: 12 }, { a: 15, b: 4, shown: 12 }, { a: 16, b: 3, shown: 13 }] }
      ]
    },
    12: {
      id: 12,
      name: 'Lightning Math',
      status: 'ready',
      // 三种题型（§6.5）：calc = 3 个数字键；balloon = 3 个写着答案的气球；flash = 3 个数字键 + 5 秒条。
      // 一律不退位：只从个位减，个位够减（a - 10 >= b）。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv12/t1_a.mp3',
          'lv12/t1_b.mp3',
          'lv12/t1_b2.mp3',
          'lv12/t1_c.mp3',
          'lv12/t2_a.mp3',
          'lv12/t2_b.mp3',
          'lv12/a1_q.mp3',
          'lv12/a2_q.mp3',
          'lv12/a3_q.mp3',
          'lv12/a4_q.mp3',
          'lv12/b1_q.mp3',
          'lv12/b2_q.mp3',
          'lv12/b3_q.mp3',
          'lv12/c1_q.mp3',
          'lv12/c2_q.mp3',
          'lv12/c3_q.mp3'
        ],
        images: []
      },
      // 三种题型共用 a - b = ? 的结构；options 是三个候选答案（气球题直接印在气球上）。
      // flash 题按 §6.9：超时与点错都记一次错、同一题重来、进度条重置。
      questions: [
        { type: 'calc', a: 17, b: 3, options: [13, 14, 15], voice: ['a1_q'] },
        { type: 'calc', a: 14, b: 2, options: [11, 12, 13], voice: ['a2_q'] },
        { type: 'calc', a: 19, b: 6, options: [12, 13, 14], voice: ['a3_q'] },
        { type: 'calc', a: 16, b: 5, options: [10, 11, 12], voice: ['a4_q'] },

        { type: 'balloon', a: 15, b: 2, options: [13, 12, 14], voice: ['b1_q'] },
        { type: 'balloon', a: 18, b: 6, options: [13, 12, 11], voice: ['b2_q'] },
        { type: 'balloon', a: 13, b: 2, options: [12, 11, 10], voice: ['b3_q'] },

        { type: 'flash', a: 18, b: 5, options: [12, 13, 14], voice: ['c1_q'] },
        { type: 'flash', a: 19, b: 7, options: [11, 12, 13], voice: ['c2_q'] },
        { type: 'flash', a: 15, b: 4, options: [10, 11, 12], voice: ['c3_q'] }
      ]
    },
    13: {
      id: 13,
      name: 'Mix It Up',
      status: 'ready',
      // 二阶大复习（§6.5）：add / sub / pic 全是 3 个数字键，纯点选、不拖拽。
      // 加法一律不进位、减法一律不退位；被减数与加数都落在 11–19 里。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv13/t1_a.mp3',
          'lv13/t1_b.mp3',
          'lv13/t1_c.mp3',
          'lv13/t2_a.mp3',
          'lv13/t2_b.mp3',
          'lv13/a1_q.mp3',
          'lv13/a2_q.mp3',
          'lv13/a3_q.mp3',
          'lv13/a4_q.mp3',
          'lv13/b1_q.mp3',
          'lv13/b2_q.mp3',
          'lv13/b3_q.mp3',
          'lv13/b4_q.mp3',
          'lv13/c_q.mp3'
        ],
        images: []
      },
      // add：a + b（个位不进位）；sub：a − b（个位够减）；pic：十格阵满十 + ones 个零散积木。
      // 三型共用一套「点数字键」的作答方式，顺序每局打乱。
      questions: [
        { type: 'add', a: 13, b: 4, options: [16, 17, 18], voice: ['a1_q'] },
        { type: 'add', a: 12, b: 6, options: [17, 18, 19], voice: ['a2_q'] },
        { type: 'add', a: 14, b: 2, options: [15, 16, 17], voice: ['a3_q'] },
        { type: 'add', a: 11, b: 8, options: [18, 19, 17], voice: ['a4_q'] },

        { type: 'sub', a: 17, b: 5, options: [11, 12, 13], voice: ['b1_q'] },
        { type: 'sub', a: 19, b: 4, options: [14, 15, 16], voice: ['b2_q'] },
        { type: 'sub', a: 16, b: 3, options: [12, 13, 14], voice: ['b3_q'] },
        { type: 'sub', a: 18, b: 4, options: [13, 14, 15], voice: ['b4_q'] },

        { type: 'pic', ones: 4, options: [13, 14, 15], voice: ['c_q'] },
        { type: 'pic', ones: 8, options: [17, 18, 19], voice: ['c_q'] }
      ]
    },
    14: {
      id: 14,
      name: 'Match Maker',
      status: 'ready',
      // 拖拽配对（§6.5）：算式卡可拖，数字卡是落点，一律 3 个候选。
      // pair   = 左 1 张算式 → 右边 3 个数字里拖到正确的那个（4 题）
      // listen = 左 3 张算式，语音点名一张 → 拖到右边对应数字（3 题，干扰项不等于任何数字）
      // reverse= 左边 1 个数字 → 把右边正确的算式拖过去（3 题，恰好一张成立）
      // 一律不进位 / 不退位（二阶复习）。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv14/t1_a.mp3',
          'lv14/t1_b.mp3',
          'lv14/t2_a.mp3',
          'lv14/t2_b.mp3',
          'lv14/t2_c.mp3',
          'lv14/a_q.mp3',
          'lv14/b1_q.mp3',
          'lv14/b2_q.mp3',
          'lv14/b3_q.mp3',
          'lv14/c1_q.mp3',
          'lv14/c2_q.mp3',
          'lv14/c3_q.mp3'
        ],
        images: []
      },
      // 判对只看数学：算式值 === 数字卡。listen 的干扰算式故意不等于任何数字，
      // 所以「拖错卡」永远是错的，孩子不会被「其实也对」绕晕。
      questions: [
        { type: 'pair', a: 14, b: 3, op: '+', numbers: [17, 18, 15], voice: ['a_q'] },
        { type: 'pair', a: 16, b: 4, op: '-', numbers: [12, 13, 11], voice: ['a_q'] },
        { type: 'pair', a: 11, b: 5, op: '+', numbers: [16, 17, 15], voice: ['a_q'] },
        { type: 'pair', a: 18, b: 5, op: '-', numbers: [13, 14, 12], voice: ['a_q'] },

        { type: 'listen', ask: 0, numbers: [12, 14, 17], voice: ['b1_q'],
          eqs: [{ a: 16, b: 4, op: '-' }, { a: 11, b: 5, op: '+' }, { a: 18, b: 5, op: '-' }] },
        { type: 'listen', ask: 0, numbers: [15, 18, 14], voice: ['b2_q'],
          eqs: [{ a: 13, b: 5, op: '+' }, { a: 12, b: 4, op: '+' }, { a: 19, b: 6, op: '-' }] },
        { type: 'listen', ask: 0, numbers: [11, 17, 13], voice: ['b3_q'],
          eqs: [{ a: 16, b: 5, op: '-' }, { a: 12, b: 3, op: '+' }, { a: 19, b: 7, op: '-' }] },

        { type: 'reverse', target: 18, voice: ['c1_q'],
          eqs: [{ a: 10, b: 8, op: '+' }, { a: 12, b: 5, op: '+' }, { a: 19, b: 4, op: '-' }] },
        { type: 'reverse', target: 14, voice: ['c2_q'],
          eqs: [{ a: 11, b: 3, op: '+' }, { a: 16, b: 3, op: '-' }, { a: 12, b: 4, op: '+' }] },
        { type: 'reverse', target: 16, voice: ['c3_q'],
          eqs: [{ a: 13, b: 3, op: '+' }, { a: 18, b: 4, op: '-' }, { a: 11, b: 6, op: '+' }] }
      ]
    },
    15: {
      id: 15,
      name: 'Final Challenge',
      status: 'ready',
      // 二阶结业挑战（§6.13）：10 题混合大考，题型与顺序全随机。
      // tap    = 听音点选（算式卡 + 3 个数字键），4 题
      // blocks = 看图拖拽（一捆十块 + n 块零散 → 拖到数字卡），3 题
      // wrong  = 找错误算式（三句里恰好一句错，答对后翻成正确答案），3 题
      // 一律不进位 / 不退位；金星后追加二阶结业仪式（彩带 + 奖杯 + 专属语音）。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv15/t1_a.mp3',
          'lv15/t1_b.mp3',
          'lv15/t1_c.mp3',
          'lv15/t2_a.mp3',
          'lv15/t2_b.mp3',
          'lv15/a1_q.mp3',
          'lv15/a2_q.mp3',
          'lv15/a3_q.mp3',
          'lv15/a4_q.mp3',
          'lv15/b_q.mp3',
          'lv15/c_q.mp3',
          'lv15/win.mp3'
        ],
        images: []
      },
      // wrong 题的三句里恰好一句 value ≠ shown，另外两句真的成立（§6.11）。
      questions: [
        { type: 'tap', a: 15, b: 3, op: '+', options: [18, 17, 19], voice: ['a1_q'] },
        { type: 'tap', a: 12, b: 4, op: '+', options: [16, 15, 17], voice: ['a2_q'] },
        { type: 'tap', a: 17, b: 5, op: '-', options: [12, 13, 11], voice: ['a3_q'] },
        { type: 'tap', a: 11, b: 6, op: '+', options: [17, 16, 18], voice: ['a4_q'] },

        { type: 'blocks', ones: 5, options: [15, 16, 17], voice: ['b_q'] },
        { type: 'blocks', ones: 3, options: [13, 12, 14], voice: ['b_q'] },
        { type: 'blocks', ones: 8, options: [18, 17, 19], voice: ['b_q'] },

        { type: 'wrong', voice: ['c_q'], sentences: [
          { a: 11, b: 4, op: '+', shown: 15 },
          { a: 16, b: 3, op: '-', shown: 13 },
          { a: 19, b: 5, op: '-', shown: 15 }
        ] },
        { type: 'wrong', voice: ['c_q'], sentences: [
          { a: 12, b: 5, op: '+', shown: 17 },
          { a: 18, b: 4, op: '-', shown: 14 },
          { a: 13, b: 4, op: '+', shown: 15 }
        ] },
        { type: 'wrong', voice: ['c_q'], sentences: [
          { a: 11, b: 6, op: '+', shown: 17 },
          { a: 18, b: 6, op: '-', shown: 12 },
          { a: 12, b: 4, op: '+', shown: 18 }
        ] }
      ]
    },
    16: {
      id: 16,
      name: 'Make Ten',
      status: 'ready',
      // 第三阶段开场：满十进一（进位加法）。核心是「凑十」。
      // fill  = 看动画自动凑满十格阵 → 点总数（4 题）
      // drag  = 自己拖苹果把十格阵凑满 → 再点总数（3 题，§6.8 两段式）
      // wrong = 三句里找错的一句（3 题，§6.11）
      // 十格阵里一律 6–9 个，外面一律 3–7 个，和都落在 12–16（都进位）。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv16/t1_a.mp3',
          'lv16/t2_a.mp3',
          'lv16/t2_b.mp3',
          'lv16/t2_c.mp3',
          'lv16/t3_a.mp3',
          'lv16/a1_q.mp3',
          'lv16/a2_q.mp3',
          'lv16/a3_q.mp3',
          'lv16/a4_q.mp3',
          'lv16/b_fill_q.mp3',
          'lv16/b_total_q.mp3',
          'lv16/c_q.mp3'
        ],
        images: []
      },
      // fill: inFrame 个在十格阵里，outside 个在外面；自动飞进 10 - inFrame 个
      // drag: 同上，但要孩子自己拖 10 - inFrame 个进去
      questions: [
        { type: 'fill', inFrame: 8, outside: 5, options: [12, 13, 14], voice: ['a1_q'] },
        { type: 'fill', inFrame: 9, outside: 3, options: [11, 12, 13], voice: ['a2_q'] },
        { type: 'fill', inFrame: 9, outside: 5, options: [13, 14, 15], voice: ['a3_q'] },
        { type: 'fill', inFrame: 8, outside: 7, options: [14, 15, 16], voice: ['a4_q'] },

        { type: 'drag', inFrame: 7, outside: 6, options: [12, 13, 14], voice: ['b_fill_q', 'b_total_q'] },
        { type: 'drag', inFrame: 8, outside: 4, options: [11, 12, 13], voice: ['b_fill_q', 'b_total_q'] },
        { type: 'drag', inFrame: 9, outside: 7, options: [15, 16, 17], voice: ['b_fill_q', 'b_total_q'] },

        { type: 'wrong', voice: ['c_q'], sentences: [
          { a: 8, b: 5, op: '+', shown: 13 },
          { a: 9, b: 6, op: '+', shown: 14 },
          { a: 7, b: 4, op: '+', shown: 11 }
        ] },
        { type: 'wrong', voice: ['c_q'], sentences: [
          { a: 6, b: 6, op: '+', shown: 12 },
          { a: 8, b: 7, op: '+', shown: 14 },
          { a: 9, b: 3, op: '+', shown: 12 }
        ] },
        { type: 'wrong', voice: ['c_q'], sentences: [
          { a: 7, b: 5, op: '+', shown: 12 },
          { a: 9, b: 8, op: '+', shown: 17 },
          { a: 6, b: 8, op: '+', shown: 15 }
        ] }
      ]
    },
    17: {
      id: 17,
      name: 'Corn Basket',
      status: 'ready',
      // 第三阶段第二关：还是凑十，换成小猴子搬玉米（筐 = 十格阵）。
      // fill   = 拖玉米把筐填满 → 再点总数（4 题，§6.8 两段式）
      // pick   = 听算式，点对应的那筐玉米（3 题，三组都不同，靠筐里/地上两个数区分）
      // split  = 8 + 5 = 8 + 2 + ? = 10 + ? = 13，点出缺的那个数（3 题）
      // 一律进位（和落在 11–17）。
      assets: {
        audio: [
          'common/ready.mp3',
          'common/try_again.mp3',
          'common/gold.mp3',
          'common/silver.mp3',
          'lv17/t1_a.mp3',
          'lv17/t1_b.mp3',
          'lv17/t2_a.mp3',
          'lv17/t2_b.mp3',
          'lv17/t2_c.mp3',
          'lv17/t3_a.mp3',
          'lv17/t3_b.mp3',
          'lv17/a1_q.mp3',
          'lv17/a2_q.mp3',
          'lv17/a3_q.mp3',
          'lv17/a4_q.mp3',
          'lv17/a_total_q.mp3',
          'lv17/b1_q.mp3',
          'lv17/b2_q.mp3',
          'lv17/b3_q.mp3',
          'lv17/c1_q.mp3',
          'lv17/c2_q.mp3',
          'lv17/c3_q.mp3',
          'lv17/c_ask_q.mp3'
        ],
        images: []
      },
      questions: [
        { type: 'fill', inBasket: 7, ground: 6, options: [12, 13, 14], voice: ['a1_q'] },
        { type: 'fill', inBasket: 8, ground: 4, options: [11, 12, 13], voice: ['a2_q'] },
        { type: 'fill', inBasket: 9, ground: 8, options: [16, 17, 18], voice: ['a3_q'] },
        { type: 'fill', inBasket: 6, ground: 5, options: [10, 11, 12], voice: ['a4_q'] },

        { type: 'pick', answer: 0, voice: ['b1_q'],
          groups: [{ basket: 9, ground: 3 }, { basket: 8, ground: 2 }, { basket: 6, ground: 5 }] },
        { type: 'pick', answer: 0, voice: ['b2_q'],
          groups: [{ basket: 8, ground: 2 }, { basket: 9, ground: 3 }, { basket: 7, ground: 4 }] },
        { type: 'pick', answer: 0, voice: ['b3_q'],
          groups: [{ basket: 6, ground: 5 }, { basket: 8, ground: 4 }, { basket: 7, ground: 6 }] },

        { type: 'split', a: 8, b: 5, split: 2, total: 13, options: [2, 3, 4], voice: ['c1_q'] },
        { type: 'split', a: 9, b: 6, split: 1, total: 15, options: [4, 5, 6], voice: ['c2_q'] },
        { type: 'split', a: 7, b: 5, split: 3, total: 12, options: [1, 2, 3], voice: ['c3_q'] }
      ]
    }
  }
};
