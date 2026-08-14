const applyV600Impl = require('./v600_patch_impl');

module.exports = function applyV600(source) {
  const out = applyV600Impl(source);
  return out.replace("!/^https:///i.test(String(p?.u || ''))", "!String(p?.u || '').startsWith('https://')");
};
