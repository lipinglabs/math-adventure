#!/usr/bin/env node
/* ============================================================
   cd-lines.js · 乘除段 L28–L48 全部台词（唯一文案来源）
   ------------------------------------------------------------
   文案纪律（《21 关按关策划案》§2.6 / §2.12）：
     · 全英文，无中文
     · 无阿拉伯数字（TTS 会逐位念）
     · 无 × ÷ = 与 times / divided by / equals / equal
     · 黑名单一次都不出现：
       left over(作余数) / remainder / cannot be divided / not divisible /
       uneven / product / quotient / equation / factor / multiple / array /
       column / area / commutative / inverse / divisor / dividend / pair /
       sorry / oops / that's fine
     · 题干 ≤8 词；任何一句 ≤14 词（工具硬上限）
     · 同一关内文本不重复（tools/gen-cd-voice.js 会校验）

   用法：被 gen-cd-voice.js 引用，不单独执行
   ============================================================ */
'use strict';

/* mood 决定 TTS 的语气指令：ask / teach / praise / encourage / count */
const LINES = {
  28: [
    ['s0a', 'Bo! Our friends are coming.', 'teach'],
    ['s0b', 'Two plates. Same on each!', 'ask'],
    ['s0c', 'One to each plate. That is one round.', 'teach'],
    ['s0d', 'One more round. All gone!', 'teach'],
    ['s0e', 'Same. Two and two.', 'praise'],
    ['s1', 'Four buns. Two plates. Give one to each.', 'ask'],
    ['s2', 'Six buns. Two plates.', 'ask'],
    ['s3', 'One is left. Who gets this one?', 'ask'],
    ['s4', 'Nine buns. Three plates.', 'ask'],
    ['s5', 'Same on each plate?', 'ask'],
    ['s6', 'One more bun. Who gets it?', 'ask'],
    ['s7', 'Are these two the same?', 'ask'],
    ['s8', 'Twelve buns. Three plates.', 'ask'],
    ['out', 'Every plate the same. Nice and tidy!', 'praise']
  ],

  29: [
    ['s0a', 'Three trays are ready.', 'teach'],
    ['s0b', 'Which one is the same on each?', 'ask'],
    ['s0c', 'Four. Four. Same!', 'teach'],
    ['s0d', 'Here: five and three. Not same.', 'teach'],
    ['s1', 'Which one is two groups of two?', 'ask'],
    ['s2', 'Which one is three groups of three?', 'ask'],
    ['s3', 'Six buns. Three plates.', 'ask'],
    ['s4', 'Ten buns. Two plates.', 'ask'],
    ['s5', 'Same on each plate?', 'ask'],
    ['s6', 'Eight buns. Four plates.', 'ask'],
    ['s7', 'Twelve buns. Four plates.', 'ask'],
    ['s8', 'Make three boxes of three.', 'ask'],
    ['out', 'You found the same one. Nice!', 'praise']
  ],

  30: [
    ['s0a', 'Three friends! Four buns each.', 'teach'],
    ['s0b', 'Bo, can you make it?', 'ask'],
    ['s0c', 'Tap here. One group of four.', 'teach'],
    ['s0d', 'One more. Two groups of four.', 'teach'],
    ['s0e', 'Again! Three groups of four. All same.', 'praise'],
    ['s1', 'Make two groups of two.', 'ask'],
    ['s2', 'Make two groups of three.', 'ask'],
    ['s3', 'Which one is two groups of three?', 'ask'],
    ['s4', 'Make three groups of three.', 'ask'],
    ['s5', 'What is under the cloth? How many altogether?', 'ask'],
    ['s6', 'Make four groups of three.', 'ask'],
    ['s7', 'Make four groups of five.', 'ask'],
    ['s8', 'Make four groups of four.', 'ask'],
    ['out', 'Three groups of four. Nice and tidy!', 'praise']
  ],

  31: [
    ['s0a', 'Chirp peeks at the trays.', 'teach'],
    ['s0b', 'Which one is three groups of four?', 'ask'],
    ['s0c', 'Count the groups. One, two, three.', 'teach'],
    ['s0d', 'Four in each group. This one.', 'teach'],
    ['s1', 'Which one is two groups of two?', 'ask'],
    ['s2', 'Tap and count.', 'ask'],
    ['s3', 'Make three groups of three.', 'ask'],
    ['s4', 'Make four groups of two.', 'ask'],
    ['s5', 'How many in each group?', 'ask'],
    ['s6', 'Make four groups of three.', 'ask'],
    ['s7', 'How many altogether?', 'ask'],
    ['s8', 'Tap the groups and count.', 'ask'],
    ['out', 'Four groups of three. You found it!', 'praise']
  ],

  32: [
    ['s0a', 'So many buns! One by one is slow.', 'teach'],
    ['s0b', 'Let us count by groups.', 'teach'],
    ['s0c', 'One group. Five.', 'teach'],
    ['s0d', 'Two groups. Ten.', 'teach'],
    ['s0e', 'Three, fifteen. Four, twenty.', 'praise'],
    ['s1', 'Tap and count.', 'ask'],
    ['s2', 'Make three groups of two.', 'ask'],
    ['s3', 'Tap them group by group.', 'ask'],
    ['s4', 'Make three groups of five.', 'ask'],
    ['s5', 'How many altogether?', 'ask'],
    ['s6', 'Make two groups of five.', 'ask'],
    ['s7', 'Tap and count first. Then altogether.', 'ask'],
    ['s8', 'Count the groups. Four of them.', 'ask'],
    ['out', 'Five, ten, fifteen, twenty. So fast!', 'praise']
  ],

  33: [
    ['s0a', 'The bundles go on and on!', 'teach'],
    ['s0b', 'How far can we count?', 'ask'],
    ['s0c', 'Five, ten, fifteen.', 'teach'],
    ['s0d', 'Keep going! Five at a time.', 'teach'],
    ['s1', 'Count by fives.', 'ask'],
    ['s2', 'Make three groups of five.', 'ask'],
    ['s3', 'Make two groups of five.', 'ask'],
    ['s4', 'Count by fives. All the way.', 'ask'],
    ['s5', 'How many altogether?', 'ask'],
    ['s6', 'Count by tens. All the way.', 'ask'],
    ['s7', 'Which row counts to fifty?', 'ask'],
    ['s8', 'Make four groups of five.', 'ask'],
    ['out', 'Five at a time. All the way to fifty!', 'praise']
  ],

  34: [
    ['s0a', 'The big tray is empty.', 'teach'],
    ['s0b', 'Two rows of three.', 'teach'],
    ['s0c', 'Tap. One row. Four buns.', 'teach'],
    ['s0d', 'Tap again. Two rows.', 'teach'],
    ['s0e', 'Three rows of four. Look!', 'praise'],
    ['s1', 'Make three rows of two.', 'ask'],
    ['s2', 'Make four rows of two.', 'ask'],
    ['s3', 'Make three rows of four.', 'ask'],
    ['s4', 'How many altogether?', 'ask'],
    ['s5', 'Which one is three rows of two?', 'ask'],
    ['s6', 'Make four rows of three.', 'ask'],
    ['s7', 'How many rows?', 'ask'],
    ['s8', 'Make five rows of four.', 'ask'],
    ['out', 'Four rows of three. Nice and tidy!', 'praise']
  ],

  35: [
    ['s0a', 'The tray is full!', 'teach'],
    ['s0b', 'How many buns altogether?', 'ask'],
    ['s0c', 'Count the rows. Four, eight, twelve.', 'teach'],
    ['s0d', 'Now this way. Three, six, nine, twelve.', 'teach'],
    ['s0e', 'Same! Twelve altogether.', 'praise'],
    ['s1', 'Count this way.', 'ask'],
    ['s2', 'Count this way too.', 'ask'],
    ['s3', 'Make three rows of four.', 'ask'],
    ['s4', 'How many altogether?', 'ask'],
    ['s5', 'Make four rows of three.', 'ask'],
    ['s6', 'Make three rows of three.', 'ask'],
    ['s7', 'Make four rows of four.', 'ask'],
    ['s8', 'Make four rows of five.', 'ask'],
    ['out', 'Twelve buns, two ways. Same!', 'praise']
  ],

  36: [
    ['s0a', 'Turn the tray. More buns now?', 'teach'],
    ['s0b', 'Let us look.', 'teach'],
    ['s0c', 'Three rows of four. Twelve.', 'teach'],
    ['s0d', 'Turn it. Four rows of three.', 'teach'],
    ['s0e', 'Still twelve! Same buns.', 'praise'],
    ['s1', 'Count this way. Now that way.', 'ask'],
    ['s2', 'Make three rows of four.', 'ask'],
    ['s3', 'Make four rows of three.', 'ask'],
    ['s4', 'How many altogether?', 'ask'],
    ['s5', 'Make four rows of two.', 'ask'],
    ['s6', 'Make three rows of three.', 'ask'],
    ['s7', 'Can you make twelve in four rows?', 'ask'],
    ['s7a', 'Watch. Twelve in four rows.', 'teach'],
    ['s8', 'Make five rows of two.', 'ask'],
    ['out', 'Turn it any way. Still twelve!', 'praise']
  ],

  37: [
    ['s0a', 'Four buns. Two friends.', 'teach'],
    ['s0b', 'Everyone gets the same!', 'teach'],
    ['s0c', 'One to each plate. That is one round.', 'teach'],
    ['s0d', 'Another round. One to each.', 'teach'],
    ['s0e', 'All gone! Three in each plate.', 'praise'],
    ['s1', 'Four buns. Two plates. Give one to each.', 'ask'],
    ['s2', 'Eight buns. Two plates.', 'ask'],
    ['s3', 'Twelve buns. Three plates.', 'ask'],
    ['s4', 'Twelve buns. Four plates.', 'ask'],
    ['s5', 'How many in each plate?', 'ask'],
    ['s6', 'Six buns. Two plates.', 'ask'],
    ['s7', 'Twelve for four friends. How many each?', 'ask'],
    ['s8', 'Fifteen buns. Three plates.', 'ask'],
    ['out', 'Round and round. All the same!', 'praise']
  ],

  38: [
    ['s0a', 'All the buns are shared.', 'teach'],
    ['s0b', 'How many in each plate?', 'ask'],
    ['s0c', 'Look at one plate. One, two, three.', 'teach'],
    ['s0d', 'This plate. Three too.', 'teach'],
    ['s0e', 'Same on each plate. Three!', 'praise'],
    ['s1', 'Six buns. Two plates. Give one to each.', 'ask'],
    ['s2', 'Twelve buns. Three plates.', 'ask'],
    ['s3', 'Twelve buns. Four plates.', 'ask'],
    ['s4', 'Eight buns. Four plates.', 'ask'],
    ['s5', 'How many altogether?', 'ask'],
    ['s6', 'Ten buns. Two plates.', 'ask'],
    ['s7', 'Tap and count.', 'ask'],
    ['s8', 'Fifteen buns. Three plates.', 'ask'],
    ['out', 'Four in each plate. Everyone happy!', 'praise']
  ],

  39: [
    ['s0a', 'Bo covers one plate.', 'teach'],
    ['s0b', 'How many in each plate?', 'ask'],
    ['s0c', 'Lift the cloth. Count one plate.', 'teach'],
    ['s0d', 'One, two.', 'teach'],
    ['s0e', 'So: two in each plate.', 'teach'],
    ['s1', 'Eight buns. Two plates. Give one to each.', 'ask'],
    ['s2', 'Nine buns. Three plates.', 'ask'],
    ['s3', 'Twelve buns. Three plates.', 'ask'],
    ['s4', 'Twelve for four friends. How many each?', 'ask'],
    ['s5', 'Fifteen for three friends. How many each?', 'ask'],
    ['s6', 'Six buns. Two plates.', 'ask'],
    ['s7', 'Ten buns. Two plates.', 'ask'],
    ['s8', 'Twelve buns. Four plates.', 'ask'],
    ['out', 'Three in each. You found it!', 'praise']
  ],

  40: [
    ['s0a', 'New day! Bags this time.', 'teach'],
    ['s0b', 'Same buns. Same friends.', 'teach'],
    ['s0c', 'Eight buns. Two plates. Four in each.', 'teach'],
    ['s0d', 'Now bags. Same eight buns.', 'teach'],
    ['s0e', 'Four in each bag. Same as before!', 'praise'],
    ['s1', 'Six blocks. Two boxes. Give one to each.', 'ask'],
    ['s2', 'Eight blocks. Two boxes.', 'ask'],
    ['s3', 'Eight blocks. Four boxes.', 'ask'],
    ['s4', 'Make three boxes of four.', 'ask'],
    ['s5', 'Ten for two boxes. How many each?', 'ask'],
    ['s6', 'Make four boxes of three.', 'ask'],
    ['s7', 'Twelve blocks. Four boxes.', 'ask'],
    ['s8', 'Make four boxes of five.', 'ask'],
    ['out', 'New bags, same answer!', 'praise']
  ],

  41: [
    ['s0a', 'Four jars. Three plates.', 'teach'],
    ['s0b', 'One for each friend.', 'teach'],
    ['s0c', 'One jar for each friend.', 'teach'],
    ['s0d', 'One more jar. No plate left.', 'teach'],
    ['s0e', 'One is left.', 'teach'],
    ['s1', 'Five jars. Two plates. Give one to each.', 'ask'],
    ['s2', 'Seven jars. Two plates.', 'ask'],
    ['s3', 'Nine jars. Two plates.', 'ask'],
    ['s4', 'Seven jars. Three plates.', 'ask'],
    ['s5', 'How many in each plate?', 'ask'],
    ['s6', 'Ten jars. Three plates. What about this one?', 'ask'],
    ['s6b', 'This one has no plate. Where does it go?', 'ask'],
    ['s7', 'How many altogether?', 'ask'],
    ['s8', 'Thirteen jars. Four plates.', 'ask'],
    ['out', 'One for each. One is left.', 'praise']
  ],

  42: [
    ['s0a', 'Two bags today.', 'teach'],
    ['s0b', 'Two in each bag.', 'teach'],
    ['s0c', 'Count two. One bag.', 'teach'],
    ['s0d', 'Two more. Two bags.', 'teach'],
    ['s0e', 'Three bags. All full!', 'praise'],
    ['s1', 'Six buns. Put two in each box.', 'ask'],
    ['s2', 'Eight buns. Put two in each box.', 'ask'],
    ['s3', 'Ten buns. Put two in each box.', 'ask'],
    ['s4', 'Six buns. Put three in each box.', 'ask'],
    ['s5', 'Twelve buns. Three in each. Four boxes?', 'ask'],
    ['s5a', 'Watch. Twelve in four boxes.', 'teach'],
    ['s6', 'Nine buns. Put three in each box.', 'ask'],
    ['s7', 'Twelve buns. Put three in each box.', 'ask'],
    ['s8', 'Fifteen buns. Put three in each box.', 'ask'],
    ['out', 'Five boxes of two. All full!', 'praise']
  ],

  43: [
    ['s0a', 'Today, five in each box.', 'teach'],
    ['s0b', 'How many boxes?', 'ask'],
    ['s0c', 'Put five in a box.', 'teach'],
    ['s0d', 'One box. Five.', 'teach'],
    ['s0e', 'Two. Three. All done!', 'praise'],
    ['s1', 'Eight buns. Put four in each box.', 'ask'],
    ['s2', 'Twelve buns. Put four in each box.', 'ask'],
    ['s3', 'Sixteen buns. Put four in each box.', 'ask'],
    ['s4', 'Twenty buns. Four in each. Five boxes?', 'ask'],
    ['s4a', 'Watch. Twenty in five boxes.', 'teach'],
    ['s5', 'Ten buns. Put five in each box.', 'ask'],
    ['s6', 'Fifteen buns. Put five in each box.', 'ask'],
    ['s7', 'Twenty buns. Put four in each box.', 'ask'],
    ['s8', 'Twenty buns. Put five in each box.', 'ask'],
    ['out', 'Three boxes of five. All done!', 'praise']
  ],

  44: [
    ['s0a', 'Twelve buns. Three friends and some boxes.', 'teach'],
    ['s0b', 'Plates or boxes?', 'ask'],
    ['s0c', 'Twelve for three friends. Plates!', 'teach'],
    ['s0d', 'One to each. Four in each plate.', 'teach'],
    ['s0e', 'Now boxes of four. Three boxes. Same buns!', 'praise'],
    ['s1', 'Twelve buns. Three plates. Give one to each.', 'ask'],
    ['s2', 'Twelve buns. Four in each. How many boxes?', 'ask'],
    ['s3', 'Twelve buns. Four plates.', 'ask'],
    ['s4', 'Twelve buns. Three in each. How many boxes?', 'ask'],
    ['s5', 'How many boxes? Four in each.', 'ask'],
    ['s6', 'Ten buns. Two in each. How many bags?', 'ask'],
    ['s7', 'How many in each plate?', 'ask'],
    ['s8', 'Eight buns. Four plates.', 'ask'],
    ['out', 'Plates or boxes? Same. Two ways.', 'praise']
  ],

  45: [
    ['s0a', 'Bo mixes it up today!', 'teach'],
    ['s0b', 'Listen carefully.', 'teach'],
    ['s0c', 'Eight buns. Two friends. Four each.', 'teach'],
    ['s0d', 'Boxes of four. Two boxes.', 'teach'],
    ['s0e', 'Hear the words. Then choose.', 'teach'],
    ['s1', 'Six buns. Three plates. Give one to each.', 'ask'],
    ['s2', 'Six buns. Two in each. How many bags?', 'ask'],
    ['s3', 'Twelve buns. Four plates.', 'ask'],
    ['s4', 'Twelve buns. Three in each. How many bags?', 'ask'],
    ['s5', 'Three in each bag. How many bags?', 'ask'],
    ['s6', 'Fifteen buns. Three in each bag.', 'ask'],
    ['s7', 'Twelve buns. Four plates. How many each?', 'ask'],
    ['s8', 'Six buns. Two plates.', 'ask'],
    ['out', 'You listened! Plates or bags, you know.', 'praise']
  ],

  46: [
    ['s0a', 'Three plates. Four on each.', 'teach'],
    ['s0b', 'Now share them out again.', 'teach'],
    ['s0c', 'Make three groups of four.', 'teach'],
    ['s0d', 'Now share with three friends. Three rounds.', 'teach'],
    ['s0e', 'Four in each. Same as before!', 'praise'],
    ['s1', 'Make four groups of three.', 'ask'],
    ['s2', 'Make three rows of four.', 'ask'],
    ['s3', 'Count this way. Now that way.', 'ask'],
    ['s4', 'Tap and count.', 'ask'],
    ['s5', 'How many altogether?', 'ask'],
    ['s6', 'Three groups of three. Then share them.', 'ask'],
    ['s6b', 'Tip them all into the middle.', 'teach'],
    ['s7', 'Which row counts to fifty?', 'ask'],
    ['s8', 'Twelve buns. Four plates.', 'ask'],
    ['out', 'Made it, shared it. Same buns!', 'praise'],
    ['out2', 'Look.', 'teach']
  ],

  47: [
    ['s0a', 'Four plates. Three on each.', 'teach'],
    ['s0b', 'Now stack them back.', 'teach'],
    ['s0c', 'Share twelve with four friends. Three each.', 'teach'],
    ['s0d', 'Now make groups of three.', 'teach'],
    ['s0e', 'Four groups of three. Twelve again!', 'praise'],
    ['s1', 'Twenty buns. Four plates.', 'ask'],
    ['s2', 'Twenty buns. Five plates.', 'ask'],
    ['s3', 'Sixteen buns. Four in each box.', 'ask'],
    ['s4', 'Twenty buns. Five in each box.', 'ask'],
    ['s5', 'Thirteen buns. Four plates. What about this one?', 'ask'],
    ['s6', 'Twelve for four friends. How many each?', 'ask'],
    ['s7', 'How many altogether?', 'ask'],
    ['s8', 'Share twelve with four friends. Then stack them.', 'ask'],
    ['s8b', 'Gather them back to the middle.', 'teach'],
    ['out', 'Back and forth. Always twelve!', 'praise'],
    ['out2', 'Look.', 'teach']
  ],

  48: [
    ['s0a', 'Twelve buns. Plates and boxes.', 'teach'],
    ['s0b', 'Listen first.', 'teach'],
    ['s0c', 'Three friends. Four in each plate.', 'teach'],
    ['s0d', 'Boxes of four. Three boxes.', 'teach'],
    ['s0e', 'Same buns. Two ways.', 'praise'],
    ['s1', 'Twelve buns. Three plates. Give one to each.', 'ask'],
    ['s2', 'Twelve buns. Four in each. How many boxes?', 'ask'],
    ['s3', 'Twelve buns. Four plates.', 'ask'],
    ['s4', 'Twelve buns. Three in each. How many bags?', 'ask'],
    ['s5', 'How many boxes? Four in each.', 'ask'],
    ['s6', 'Three groups of four. Then share them.', 'ask'],
    ['s6b', 'Tip them all into the middle.', 'teach'],
    ['s7', 'Twelve buns. Four plates. How many each?', 'ask'],
    ['s8', 'Eight buns. Two in each. How many bags?', 'ask'],
    ['out', 'Plates or boxes. Back and forth. Same buns!', 'praise'],
    ['out2', 'Look.', 'teach']
  ]
};

/* T2 / T5 累计报数用到的数字片段（只念数，不报积） */
const NUMBERS = [
  'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty-one', 'twenty-four', 'twenty-five', 'twenty-seven', 'twenty-eight',
  'thirty', 'thirty-two', 'thirty-five', 'thirty-six',
  'forty', 'forty-five', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
  'one hundred'
];

const NUM_VALUE = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  'twenty-one': 21, 'twenty-four': 24, 'twenty-five': 25, 'twenty-seven': 27,
  'twenty-eight': 28, thirty: 30, 'thirty-two': 32, 'thirty-five': 35,
  'thirty-six': 36, forty: 40, 'forty-five': 45, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, 'one hundred': 100
};

module.exports = { LINES, NUMBERS, NUM_VALUE };
