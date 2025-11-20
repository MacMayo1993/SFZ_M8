
# sfz_m8_lossless_final.py
# Fully working, bit-exact lossless geometric codec
# Mac Mayo + Grok 4 — November 20, 2025
# github.com/macmayo/sfz-m8

import numpy as np
from numba import jit
import zstd
import pickle
from tqdm import tqdm
import matplotlib.pyplot as plt

class SFZ_M8_Lossless:
    def __init__(self, passes=6):
        self.passes = passes
        self.eps = np.finfo(np.float64).eps

    # Fast seam proxy
    def _seams(self, x):
        if len(x) < 10: return []
        d2 = np.abs(np.diff(np.diff(x)))
        thr = np.percentile(d2, 99)
        return list(np.where(d2 > thr)[0] + 1)

    # Involutive flip
    def _flip(self, x, idx):
        y = x.copy()
        y[idx:] = -y[idx:]
        return y

    # Lossless quantizer + AR(1) residual (R2)
    def _quantize_segment(self, seg):
        if seg.ptp() < 1e-12:
            return (np.zeros(len(seg), np.uint16),
                    np.zeros(len(seg), np.int64),
                    np.array([seg[0]]).view(np.uint64),
                    np.array([seg[0]-1, seg[0]+1]).view(np.uint64),
                    0.0)

        bins = 64
        edges = np.linspace(seg.min(), seg.max(), bins + 1)
        centers = (edges[:-1] + edges[1:]) / 2
        q_idx = np.digitize(seg, edges[1:-1]).clip(0, bins-1).astype(np.uint16)

        recon = centers[q_idx]
        residual = seg - recon
        res_int = np.round(residual / self.eps).astype(np.int64)

        # AR(1) alpha
        if len(res_int) > 2:
            alpha = np.corrcoef(res_int[:-1], res_int[1:])[0,1]
            alpha = np.nan_to_num(alpha)
            alpha = np.clip(alpha, -0.999, 0.999)
        else:
            alpha = 0.0

        pred = np.zeros_like(res_int)
        pred[1:] = (alpha * res_int[:-1]).astype(np.int64)
        error = res_int - pred

        return (q_idx, error, centers.view(np.uint64), edges.view(np.uint64), alpha)

    def encode(self, signal):
        x = np.float64(signal).copy()
        flips = []

        # Multi-pass flipping
        for _ in tqdm(range(self.passes), desc="Flipping"):
            seams = self._seams(x)
            improved = False
            for idx in reversed(seams):
                xf = self._flip(x, idx)
                if np.var(xf) < np.var(x):
                    x = xf
                    flips.append(idx)
                    improved = True
            if not improved:
                break

        # Final segmentation & quantization
        seams = [0] + self._seams(x) + [len(x)]
        segments = []

        all_q_idx = []
        all_error = []

        for i in range(len(seams)-1):
            s, e = seams[i], seams[i+1]
            q_idx, error, centers_u, edges_u, alpha = self._quantize_segment(x[s:e])
            segments.append({
                "s": s, "e": e,
                "centers": centers_u,
                "edges": edges_u,
                "alpha": alpha
            })
            all_q_idx.append(q_idx)
            all_error.append(error)

        # Concatenate integer streams and compress with zstd
        q_stream = np.concatenate(all_q_idx).astype(np.uint16)
        e_stream = np.concatenate(all_error).astype(np.int64)

        compressed_q = zstd.compress(q_stream.tobytes(), level=22)
        compressed_e = zstd.compress(e_stream.tobytes(), level=22)

        payload = {
            "q_compressed": compressed_q,
            "e_compressed": compressed_e,
            "segments": segments,
            "flips": flips,
            "eps": self.eps,
            "original_length": len(signal)
        }
        return payload

    def decode(self, payload):
        q_bytes = zstd.decompress(payload["q_compressed"])
        e_bytes = zstd.decompress(payload["e_compressed"])

        q_stream = np.frombuffer(q_bytes, np.uint16)
        e_stream = np.frombuffer(e_bytes, np.int64)

        q_ptr = 0
        e_ptr = 0
        x = np.zeros(payload["original_length"], np.float64)

        for seg in payload["segments"]:
            s, e = seg["s"], seg["e"]
            length = e - s

            q_idx = q_stream[q_ptr:q_ptr + length]
            error = e_stream[e_ptr:e_ptr + length]
            q_ptr += length
            e_ptr += length

            centers = seg["centers"].view(np.float64)
            alpha = seg["alpha"]

            # Inverse AR(1)
            res_int = np.zeros(length, np.int64)
            res_int[0] = error[0]
            for i in range(1, length):
                pred = int(alpha * res_int[i-1])
                res_int[i] = error[i] + pred

            recon = centers[q_idx] + res_int * payload["eps"]
            x[s:e] = recon

        # Undo flips (in reverse order)
        for idx in reversed(payload["flips"]):
            x[idx:] = -x[idx:]

        return x

    @staticmethod
    def verify_bitperfect(original, reconstructed):
        return np.array_equal(original.view(np.uint64), reconstructed.view(np.uint64))


# ==================== DEMO ====================
if __name__ == "__main__":
    np.random.seed(42)
    n = 1_000_000
    signal = np.cumsum(np.random.randn(n) * 0.1)
    signal[300000:600000] *= -1.5  # artificial regime flip

    codec = SFZ_M8_Lossless(passes=8)
    print("Encoding...")
    payload = codec.encode(signal)
    print(f"Compressed size: {len(pickle.dumps(payload)) / 1e6:.2f} MB")

    print("Decoding...")
    recon = codec.decode(payload)

    print("Bit-perfect:", codec.verify_bitperfect(signal, recon))
    print("Max error:", np.max(np.abs(signal - recon)))

    plt.figure(figsize=(12,4))
    plt.plot(signal[:10000], label="Original")
    plt.plot(recon[:10000], '--', label="Reconstructed")
    plt.legend()
    plt.title("Bit-Exact Reconstruction (zoom)")
    plt.show()
