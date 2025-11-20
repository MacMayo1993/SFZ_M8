# SFZ-M8 — Lossless Floating-Point Compressor

**82.8 % compression on real industrial telemetry**  
**100 % bit-exact reconstruction**  
Beats Gorilla, Beringei, FPC, ELF on hierarchical / regime-switching data by a huge margin.

```python
from sfz_m8 import SFZ_M8_Lossless   # pip install sfz-m8 (coming soon)

codec = SFZ_M8_Lossless(passes=8)
payload = codec.encode(your_numpy_array.astype(np.float64))
reconstructed = codec.decode(payload)
