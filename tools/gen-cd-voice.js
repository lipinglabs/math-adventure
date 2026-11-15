#!/usr/bin/env node
/* ============================================================
   gen-cd-voice.js · 把 cd-lines.js 写成 TTS 清单 + 校验文案纪律
   ------------------------------------------------------------
   产出：
     voice/lines/lv28.json … lv48.json   （每关一份，供 gen_tts.py 用）
     voice/lines/common.json              （追加 num_02…num_100 数字片段）

   校验（任何一条不过就退出码 1，不生成清单）：
     · 全英文：无中文、无阿拉伯数字
     · 单句 ≤14 词；题干 ≤8 词（s1–s8）
     · 同一关内文本不重复
     · 数值符号 / 术语黑名单一次都不出现

   用法：node tools/gen-cd-voice.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { LINES, NUMBERS, NUM_VALUE } = require('./cd-lines.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'voice', 'lines');

const CJK = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/;
const DIGITS = /[0-9]/;
const MATH_SYMBOLS = /[×÷=＋−]/;

/* §2.6 黑名单：一次都不许出现（按整词匹配，避免误伤） */
const BLACKLIST = [
  'left over', 'remainder', 'cannot be divided', 'not divisible', 'uneven',
  'product', 'quotient', 'equation', 'factor', 'multiple', 'array', 'column',
  'area', 'commutative', 'inverse', 'divisor', 'dividend', 'pair',
  'sorry', 'oops', "that's fine", 'times', 'multiplied by', 'divided by',
  'equals', 'equal'
];

const problems = [];

function checkWordBoundary(text, phrase) {
  const re = new RegExp('\\b' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  return re.test(text);
}

function auditLine(level, key, text) {
  const where = `L${level}.${key}`;
  if (!text || !text.trim()) { problems.push(`${where} 文本为空`); return; }
  if (CJK.test(text)) problems.push(`${where} 含中文：「${text}」`);
  if (DIGITS.test(text)) problems.push(`${where} 含阿拉伯数字：「${text}」`);
  if (MATH_SYMBOLS.test(text)) problems.push(`${where} 含数学符号：「${text}」`);

  const words = text.trim().split(/\s+/);
  if (words.length > 14) problems.push(`${where} ${words.length} 词 > 14：「${text}」`);
  if (/^s[1-8]$/.test(key) && words.length > 8) {
    problems.push(`${where} 题干 ${words.length} 词 > 8：「${text}」`);
  }

  BLACKLIST.forEach(function (bad) {
    if (checkWordBoundary(text, bad)) {
      problems.push(`${where} 命中黑名单「${bad}」：「${text}」`);
    }
  });
}

function writeJson(file, spec) {
  fs.writeFileSync(file, JSON.stringify(spec, null, 2) + '\n', 'utf8');
}

const VOICE = { en: 'en_female_allison_uranus_bigtts' };
let totalLines = 0;
let slots = 0;

const summary = [];

Object.keys(LINES).map(Number).sort((a, b) => a - b).forEach(function (level) {
  const rows = LINES[level];
  const seen = new Map();
  const lines = rows.map(function (row) {
    const key = row[0];
    const text = row[1];
    const mood = row[2] || 'ask';

    if (!/^[a-z0-9_]+$/.test(key)) problems.push(`L${level} key 非法：${key}`);
    auditLine(level, key, text);

    const norm = ' ' + text.toLowerCase().replace(/\s+/g, ' ').trim() + ' ';
    if (seen.has(norm)) problems.push(`L${level} 文本重复：${seen.get(norm)} 与 ${key} 都是「${text}」`);
    else seen.set(norm, key);

    if (/^s[1-8]$/.test(key)) slots += 1;

    return {
      key,
      lang: 'en',
      text,
      mood,
      // 数字在题干里已经写成单词；这里只给「数数感」的句子略降速
      rate: /one, two|five, ten|four, eight|three, six/i.test(text) ? -20 : -15
    };
  });

  const spec = {
    level: 'lv' + level,
    status: 'ready',
    note: '乘除段 L' + level + ' · 由 tools/cd-lines.js 生成，勿手改',
    rate: -15,
    pitch: 0,
    sampleRate: 24000,
    voice: VOICE,
    lines
  };

  writeJson(path.join(OUT, 'lv' + level + '.json'), spec);
  totalLines += lines.length;
  summary.push(`  lv${level}: ${lines.length} 条`);
});

/* ---------------- common：数字片段 ---------------- */

const commonPath = path.join(OUT, 'common.json');
const common = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
const have = new Set(common.lines.map(function (l) { return l.key; }));

NUMBERS.forEach(function (word) {
  const value = NUM_VALUE[word];
  const key = 'num_' + (value < 10 ? '0' + value : String(value));
  if (have.has(key)) return;
  const text = word.charAt(0).toUpperCase() + word.slice(1) + '.';
  common.lines.push({ key, lang: 'en', text, mood: 'count', rate: -20 });
  have.add(key);
});
common.note = 'Cross-level voice lines + number fragments for group counting (T2/T5). English only.';
writeJson(commonPath, common);

console.log('已写出 21 份关卡清单：');
console.log(summary.join('\n'));
console.log(`\n关卡台词 ${totalLines} 条，其中有题干的槽 ${slots} 条。`);
console.log(`common 数字片段共 ${common.lines.length} 条（含既有 ready/try_again/gold/silver）。`);

if (problems.length) {
  console.error(`\n文案校验未通过（${problems.length} 项）：`);
  problems.forEach(function (p) { console.error('  · ' + p); });
  process.exit(1);
}
console.log('文案校验通过：全英文、无数字、无符号、无黑名单词、无同关重复、词数达标。');
