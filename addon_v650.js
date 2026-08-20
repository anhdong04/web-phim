'use strict';

// Install HH4K browser/direct-stream hooks before the HH4K bridge creates its
// provider instance. The existing v6.4.1 launcher still handles every non-HH4K
// route exactly as before.
require('./hh4k_browser_patch');
require('./hh4k_bridge');

// HHTQ direct resolver patches the provider prototype before the bridge creates
// its instance. This guarantees Nuvio receives media URLs instead of web embeds.
require('./hhtq_browser_patch');
require('./hhtq_bridge');

// Secure multi-user builder is an outer HTTP layer. It owns /configure,
// authenticated /api/* and /a/<publicId>/*, while delegating provider work to
// the already-tested Full/IPTV handlers.
require('./multiuser_secure');

require('./addon_v641');
