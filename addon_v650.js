'use strict';

// Install HH4K browser/direct-stream hooks before the HH4K bridge creates its
// provider instance. The existing v6.4.1 launcher still handles every non-HH4K
// route exactly as before.
require('./hh4k_browser_patch');
require('./hh4k_bridge');
require('./addon_v641');
