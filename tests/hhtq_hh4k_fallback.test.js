'use strict';

const assert = require('node:assert/strict');
const { normTitle, titleScore, pickBest, episodeIndexFor } = require('../hhtq_hh4k_fallback');

assert.equal(normTitle('Tây Hành Kỷ (Ám Ảnh Ma Thành) (2023)'), 'tay hanh ky am anh ma thanh 2023');
assert.ok(titleScore('Tây Hành Kỷ (Ám Ảnh Ma Thành)', 'Tây Hành Kỷ: Ám Ảnh Ma Thành') >= 85);
assert.ok(titleScore('Tây Hành Kỷ (Ám Ảnh Ma Thành)', 'Tiên Nghịch') < 55);

const best = pickBest('Tây Hành Kỷ (Ám Ảnh Ma Thành)', [
  { title: 'Tây Hành Kỷ Phần 4' },
  { title: 'Tây Hành Kỷ: Ám Ảnh Ma Thành' },
  { title: 'Tây Hành Kỷ: Cùng Kỳ Địa Động' }
]);
assert.equal(best.item.title, 'Tây Hành Kỷ: Ám Ảnh Ma Thành');

assert.equal(episodeIndexFor({ number: 3, name: 'Tập 3' }, [
  { number: 1, name: 'Tập 1' },
  { number: 3, name: 'Tập 3' }
]), 1);
assert.equal(episodeIndexFor({ number: null, name: 'Tập Full' }, [{ number: null, name: 'Tập Full' }]), 0);

console.log('hhtq hh4k fallback tests: PASS');
