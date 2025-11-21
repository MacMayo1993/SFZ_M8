import numpy as np
from sfz_m8 import SFZ_M8_TungstenOracle

oracle = SFZ_M8_TungstenOracle(passes=8)
results = []

for seed in range(10):
    np.random.seed(seed)
    signal = np.cumsum(np.random.randn(100_000) * 0.1).astype(np.float64)
    signal[30_000:60_000] *= -1.5
    
    payload = oracle.encode(signal)
    recon = oracle.decode(payload)
    
    perfect = oracle.verify_bitperfect(signal, recon)
    ratio = signal.nbytes / len(payload)
    results.append((seed, perfect, ratio))
    
print("Seed | Bit-perfect | Ratio")
print("-" * 35)
for seed, perfect, ratio in results:
    print(f"{seed:4d} | {perfect!s:11} | {ratio:5.2f}×")

avg_ratio = np.mean([r[2] for r in results])
print(f"\nAverage ratio: {avg_ratio:.2f}×")
print(f"All bit-perfect: {all(r[1] for r in results)}")
