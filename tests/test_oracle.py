import numpy as np
from sfz_m8 import SFZ_M8_TungstenOracle

np.random.seed(42)
n = 1_000_000
signal = np.cumsum(np.random.randn(n) * 0.1).astype(np.float64)
signal[300_000:600_000] *= -1.5

oracle = SFZ_M8_TungstenOracle(passes=8)
payload = oracle.encode(signal)
recon = oracle.decode(payload)

print("Bit-perfect:", oracle.verify_bitperfect(signal, recon))
print(f"Compressed: {len(payload)/1e6:.3f} MB")
print(f"Ratio: {signal.nbytes / len(payload):.2f}×")
