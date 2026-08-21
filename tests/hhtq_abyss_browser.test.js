'use strict';
const assert=require('node:assert');
const {isAbyss}=require('../hhtq_abyss_browser_patch');
assert.equal(isAbyss('https://play.abyssplayer.com/zcALcZJDF'),true);
assert.equal(isAbyss('https://abyssplayer.com/abc'),true);
assert.equal(isAbyss('https://ok.ru/videoembed/1'),false);
console.log('hhtq Abyssplayer browser tests: PASS');
