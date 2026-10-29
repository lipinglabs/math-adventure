# 数学冒险 · math-adventure

面向 3–6 岁幼儿的数学启蒙游戏。纯静态网页，原生 HTML / CSS / JS，无框架、无构建、无后端。

## 现在能玩到什么

当前是**第一天骨架**：可浏览地图、进入关卡时走完整的「素材加载」流程，第一关内容正在按确认稿搭建。

## 本地运行

```bash
python -m http.server 8765 --bind 127.0.0.1
# 打开 http://127.0.0.1:8765/index.html
```

验收参数：

- `?demo=loader`：用假素材演示加载进度条
- `?demo=fail`：演示加载失败与重试

## 工程结构

| 文件 | 职责 |
|---|---|
| `index.html` | 页面骨架（地图屏 / 关卡屏 / 加载遮罩 / 弹层） |
| `style.css` | 果冻 / 粘土风样式 |
| `levels_data.js` | 地图坐标与关卡配置（纯数据） |
| `engine.js` | 资源加载、进度条、音频、动画、判定、3D 扩展位 |
| `progress.js` | 进度、星级、解锁、合并 |
| `cloud.js` | Gist 云存档（最高关卡覆盖） |
| `sandbox.js` | 开发者后门（左上角连点 5 次，口令 123） |
| `app.js` | 启动、地图渲染、路由 |

## 文档

- [`PROJECT_MATH_RULES.md`](PROJECT_MATH_RULES.md)：项目铁律，最高约束，改动前必读
- [`HANDOVER.md`](HANDOVER.md)：环境、密钥、推送方式、验收命令
- [`docs/LEVEL_01_DESIGN.md`](docs/LEVEL_01_DESIGN.md)：第一关台词与动画方案（待确认）

## 语音

由豆包语音合成 2.0 在构建期生成独立 mp3，运行时不调用任何外部接口。

```bash
python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01 --dry-run   # 校验
python tools/gen_tts.py voice/lines/lv01.json --out voice/lv01             # 生成
```

密钥只从 `DOUBAO_API_KEY` 环境变量或本机 `config/secrets.local.json` 读取，绝不入库。

## 推送

本机 `git push` 被网络拦截，统一走 Git Data API：

```bash
python tools/push_via_api.py "提交说明"
```
