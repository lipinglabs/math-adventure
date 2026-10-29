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
    version: '0.2.0',
    // 音频根目录。页面运行时按关拼路径，只请求当前关用到的文件。
    audioBase: 'voice/'
  },

  map: {
    viewBox: { w: 390, h: 620 },
    spots: [
      { level: 1, x: 128, y: 520 },
      { level: 2, x: 212, y: 356 },
      { level: 3, x: 152, y: 196 }
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
      name: 'Add to Ten',
      status: 'coming',
      assets: { audio: [], images: [] }
    }
  }
};
