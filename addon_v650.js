'use strict';

// Install HH4K browser/direct-stream hooks before the HH4K bridge creates its
// provider instance. The existing v6.4.1 launcher still handles every non-HH4K
// route exactly as before.
require('./hh4k_browser_patch');
require('./hh4k_bridge');

// HHTQ host resolvers are installed first. Relay/diagnostic HTTP wrappers must
// be registered BEFORE the catch-all /hhtq bridge so they become the outer
// request layers and are not swallowed by the bridge's /hhtq/* interception.
require('./hhtq_exact_patch');
require('./hhtq_relay');
require('./hhtq_diag_patch');
require('./hhtq_bridge');

// Secure multi-user builder is an outer HTTP layer. It owns /configure,
// authenticated /api/* and /a/<publicId>/*, while delegating provider work to
// the already-tested Full/IPTV handlers.
require('./multiuser_secure');

require('./addon_v641');
