(function () {
    'use strict';

    function* nagellLutzFactors(n) {
        for (let d0 = 1n, d1 = 1n; d0 <= n; d0 += d1 += 2n) {
            if (n % d0 == 0n) {
                yield (d1 + 1n) >> 1n;
            }
        }
    }

    self.onmessage = (event) => {
        const n = event.data;
        for (const d of nagellLutzFactors(n)) {
            postMessage(d);
        }
        postMessage(null);
    };

})();
//# sourceMappingURL=nagell-lutz.js.map
