/* ============================================================
   levels_data.js · 关卡与地图配置（纯数据，不含逻辑）
   ------------------------------------------------------------
   一个关卡 = 地图坐标 + 素材清单 + 教学分镜 + 10 道题。
   新增关卡只需在本文件追加条目并补 voice/<lv>/ 下的音频，
   不得为了加关卡去改 engine.js 或 app.js。

   坐标系统：与 index.html 里 <svg viewBox="0 0 390 620"> 完全一致，
   单位是 SVG 用户单位，由 app.js 换算成百分比定位。
   ============================================================ */

window.MATH_DATA = {
  meta: {
    title: '数学冒险',
    version: '0.1.0',
    // 音频根目录。页面运行时按关拼路径，只请求当前关用到的文件。
    audioBase: 'voice/',
    maxUnlockedFallback: 1
  },

  map: {
    viewBox: { w: 390, h: 620 },
    spots: [
      { level: 1, x: 128, y: 520 },
      { level: 2, x: 212, y: 356 },
      { level: 3, x: 152, y: 196 }
    ]
  },

  /* 公共语音：只在首次交互后预热，不阻塞首屏。
     文件尚未生成时 loadAudio 会失败，引擎按「非致命」处理。 */
  commonAudio: [
    // 'common/coming.mp3',
    // 'common/win_gold.mp3',
    // 'common/win_silver.mp3'
  ],

  levels: {
    1: {
      id: 1,
      name: '5 以内加法',
      subtitle: '数一数，合起来是几',
      // wip = 尚未实现内容；进入后显示占位卡，但加载流程与真实关卡完全一致
      status: 'wip',
      // 本关素材清单（相对 meta.audioBase）。第一关音频待台词确认后生成。
      assets: {
        audio: [],
        images: []
      },
      // ?demo=loader 时用来演示进度条；真实素材接入后应删除该字段
      demoAssets: 12,
      tutorial: [],
      questions: []
    },

    2: {
      id: 2,
      name: '5 以内减法',
      status: 'coming',
      assets: { audio: [], images: [] }
    },

    3: {
      id: 3,
      name: '10 以内加法',
      status: 'coming',
      assets: { audio: [], images: [] }
    }
  }
};
