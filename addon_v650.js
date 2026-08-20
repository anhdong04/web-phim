'use strict';

// Install HH4K browser/direct-stream hooks before the HH4K bridge creates its
// provider instance. The existing v6.4.1 launcher still handles every non-HH4K
// route exactly as before.
require('./hh4k_browser_patch');
require('./hh4k_bridge');

// HHTQ provider patches must be installed before bridge construction. The
// catch-all bridge is then wrapped by relay/diagnostic handlers so /hhtq/relay
// is handled before the bridge's generic /hhtq/* interception.
require('./hhtq_exact_patch');
require('./hhtq_watch_known_hosts_patch');
require('./hhtq_bridge');
require('./hhtq_relay');
require('./hhtq_diag_patch');
require('./hhtq_watch_diag_patch');

// Secure multi-user builder is an outer HTTP layer. It owns /configure,
// authenticated /api/* and /a/<publicId>/*, while delegating provider work to
// the already-tested Full/IPTV handlers.
require('./multiuser_secure');

require('./addon_v641');
