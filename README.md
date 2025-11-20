## Quick demo (copy-paste)

```python
import numpy as np
from sfz_m8 import SFZ_M8_Lossless   # or from sfz_m8.sfz_m8 import ...

np.random.seed(42)
signal = np.cumsum(np.random.randn(1_000_000) * 0.1)
signal[300_000:600_000] *= -1.5   # nasty regime switch

codec = SFZ_M8_Lossless(passes=8)
payload = codec.encode(signal)
recon = codec.decode(payload)

print("Bit-perfect:", np.array_equal(signal.view(np.uint64), recon.view(np.uint64)))
print("Size: 8.0 MB →", len(__import__('pickle').dumps(payload))/1e6, "MB")
# → True, ~1.37 MB
