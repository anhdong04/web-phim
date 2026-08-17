'use strict';

// HH4K interceptor is installed first, then the existing v6.4.1 launcher keeps
// handling every non-HH4K route exactly as before.
require('./hh4k_bridge');
require('./addon_v641');
