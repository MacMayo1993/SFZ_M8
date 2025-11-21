# sfz_m8_lossless.py
# SFZ-M8 Tungsten Oracle v0.1.1 — Lossless Geometric Quantization
# Mac Mayo — November 21, 2025
# github.com/MacMayo1993/SFZ_M8

import numpy as np
import zstandard as zstd
import pickle
from tqdm import tqdm
import matplotlib.pyplot as plt

class SFZ_M8_Lossless:
    def __init__(self, passes: int = 6, bins: int = 64, zstd_level: int = 22):
        self.passes = passes
        self.bins = bins
        self.zstd_level = zstd_level
        self.eps = np.finfo(np.float64).eps

    # Fast curvature-based seam detection
    def _seams(self, x: np.ndarray):
        if len(x) < 1000:
            return []
        d2 = np.abs(np.diff(np.diff(x)))
        if len(d2) == 0:
            return []
        thr = np.percentile(d2, 99.99)  # Much more selective
        candidates = np.where(d2 > thr)[0] + 1
        # Enforce minimum spacing between seams
        if len(candidates) == 0:
            return []
        seams = [candidates[0]]
        for c in candidates[1:]:
            if c - seams[-1] >= 5000:  # At least 5000 samples between seams
                seams.append(c)
        return seams

    # Involutive sign flip
    @staticmethod
    def _flip(x: np.ndarray, idx: int) -> np.ndarray:
        y = x.copy()
        y[idx:] = -y[idx:]
        return y

    # Lossless quantizer + AR(1) residual + XOR safety shield
    def _quantize_segment(self, seg: np.ndarray):
        n = len(seg)
        if np.ptp(seg) < 1e-12:  # constant segment
            return {
                "q_idx": np.zeros(n, np.uint16),
                "centers": np.array([seg[0]]).view(np.uint64),
                "alpha": 0.0,
                "err_stream": np.zeros(n, np.int64),
                "fb_idx": np.empty(0, np.int32),
                "fb_xor": np.empty(0, np.uint64),
            }

        edges = np.linspace(seg.min(), seg.max(), self.bins + 1)
        centers = (edges[:-1] + edges[1:]) / 2
        q_idx = np.digitize(seg, edges[1:-1]).clip(0, self.bins - 1).astype(np.uint16)
        recon = centers[q_idx]

        # Direct XOR-based residual encoding (more efficient)
        xor_residuals = seg.view(np.uint64) ^ recon.view(np.uint64)
        err_stream = xor_residuals.astype(np.int64)
        fb_idx = np.empty(0, np.int32)
        fb_xor = np.empty(0, np.uint64)
        alpha = 0.0  # Not used for XOR encoding

        return {
            "q_idx": q_idx,
            "centers": centers.view(np.uint64),
            "alpha": alpha,
            "err_stream": err_stream,
            "fb_idx": fb_idx,
            "fb_xor": fb_xor,
        }

    def encode(self, signal: np.ndarray) -> bytes:
        x = np.asarray(signal, dtype=np.float64).copy()
        flips = []

        # Multi-pass involutive rectification
        for _ in tqdm(range(self.passes), desc="SFZ-M8 passes"):
            seams = self._seams(x)
            improved = False
            current_var = np.var(x)
            for idx in reversed(seams):
                xf = self._flip(x, idx)
                new_var = np.var(xf)
                if new_var < current_var:
                    x = xf
                    current_var = new_var
                    flips.append(idx)
                    improved = True
            if not improved:
                break

        # Final segmentation & quantization
        seams = [0] + self._seams(x) + [len(x)]
        segments = []
        q_parts = []
        e_parts = []

        for i in range(len(seams)-1):
            s, e = seams[i], seams[i+1]
            qinfo = self._quantize_segment(x[s:e])
            segments.append({
                "s": s, "e": e,
                "centers": qinfo["centers"],
                "alpha": qinfo["alpha"],
                "fb_idx": qinfo["fb_idx"],
                "fb_xor": qinfo["fb_xor"]
            })
            q_parts.append(qinfo["q_idx"])
            e_parts.append(qinfo["err_stream"])

        q_stream = np.concatenate(q_parts).astype(np.uint16)
        e_stream = np.concatenate(e_parts).astype(np.int64)

        # zstd compression
        payload = {
            "q_compressed": zstd.compress(q_stream.tobytes(), self.zstd_level),
            "e_compressed": zstd.compress(e_stream.tobytes(), self.zstd_level),
            "segments": segments,
            "flips": flips,
            "eps": self.eps,
            "original_length": len(signal)
        }
        return pickle.dumps(payload)

    def decode(self, payload_bytes: bytes) -> np.ndarray:
        payload = pickle.loads(payload_bytes)
        q_stream = np.frombuffer(zstd.decompress(payload["q_compressed"]), np.uint16)
        e_stream = np.frombuffer(zstd.decompress(payload["e_compressed"]), np.int64)

        q_ptr = e_ptr = 0
        x = np.zeros(payload["original_length"], np.float64)

        for seg in payload["segments"]:
            s, e = seg["s"], seg["e"]
            length = e - s

            q_idx = q_stream[q_ptr:q_ptr + length]
            err = e_stream[e_ptr:e_ptr + length]
            q_ptr += length
            e_ptr += length

            centers = seg["centers"].view(np.float64)
            alpha = seg["alpha"]

            # XOR-based reconstruction (direct)
            xor_residuals = err.astype(np.uint64)
            recon_bits = centers[q_idx].view(np.uint64) ^ xor_residuals
            recon = recon_bits.view(np.float64)

            x[s:e] = recon

        # Undo flips (reverse order)
        for idx in reversed(payload["flips"]):
            x[idx:] = -x[idx:]

        return x

    @staticmethod
    def verify_bitperfect(a, b):
        a = np.asarray(a, dtype=np.float64)
        b = np.asarray(b, dtype=np.float64)
        return np.array_equal(a.view(np.uint64), b.view(np.uint64))

    @staticmethod
    def real_size(payload_bytes):
        """Accurate size of the actual compressed payload (no pickle bloat)."""
        if isinstance(payload_bytes, bytes):
            payload = pickle.loads(payload_bytes)
        else:
            payload = payload_bytes
        q = len(payload["q_compressed"])
        e = len(payload["e_compressed"])
        meta = len(pickle.dumps(payload["segments"])) + len(pickle.dumps(payload["flips"]))
        return (q + e + meta) / (1024 * 1024)


# ==================== DEMO ====================
if __name__ == "__main__":
    np.random.seed(42)
    n = 1_000_000
    signal = np.cumsum(np.random.randn(n) * 0.1)
    signal[300000:600000] *= -1.5  # artificial regime flip

    codec = SFZ_M8_Lossless(passes=1, bins=1024, zstd_level=22)
    print("Encoding...")
    payload = codec.encode(signal)

    # Detailed compression statistics
    payload_dict = pickle.loads(payload)
    q_size = len(payload_dict["q_compressed"]) / (1024*1024)
    e_size = len(payload_dict["e_compressed"]) / (1024*1024)
    total_size = codec.real_size(payload)
    raw_size = signal.nbytes / (1024*1024)

    print(f"\n=== Compression Statistics ===")
    print(f"Raw signal size: {raw_size:.2f} MB")
    print(f"Quantization indices (compressed): {q_size:.2f} MB")
    print(f"Error stream (compressed): {e_size:.2f} MB")
    print(f"Total compressed size: {total_size:.2f} MB")
    print(f"Compression ratio: {raw_size / total_size:.2f}x")
    print(f"Segments: {len(payload_dict['segments'])}")
    print(f"Flips applied: {len(payload_dict['flips'])}")

    print("\nDecoding...")
    recon = codec.decode(payload)

    print("\n=== Verification ===")
    print(f"Bit-perfect: {codec.verify_bitperfect(signal, recon)}")
    print(f"Max error: {np.max(np.abs(signal - recon))}")

    plt.figure(figsize=(12,4))
    plt.plot(signal[:20000], label="Original", alpha=0.8)
    plt.plot(recon[:20000], '--', label="Reconstructed")
    plt.legend()
    plt.title("Bit-Exact Reconstruction (zoom)")
    plt.tight_layout()
    plt.savefig("reconstruction.png", dpi=100)
    print("\nPlot saved to reconstruction.png")
