import numpy as np
import zstandard as zstd
import pickle
from typing import List, Dict, Any

class SFZ_M8_TungstenOracle:
    def __init__(self, passes: int = 6, bins: int = 64, zstd_level: int = 22):
        self.passes = passes
        self.bins = bins
        self.zstd_level = zstd_level
        self.eps = np.finfo(np.float64).eps
        self.inv_eps = 1.0 / self.eps

    def _seams(self, x: np.ndarray) -> List[int]:
        if x.size < 10:
            return []
        d2 = np.abs(np.diff(np.diff(x)))
        thr = np.percentile(d2, 99)
        return list(np.where(d2 > thr)[0] + 1)

    @staticmethod
    def _flip(x: np.ndarray, idx: int) -> np.ndarray:
        y = x.copy()
        y[idx:] = -y[idx:]
        return y

    def _quantize_segment(self, seg: np.ndarray) -> Dict[str, Any]:
        n = seg.size

        if seg.ptp() < 1e-12:
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

        diff = seg - recon
        r_vec = np.round(diff * self.inv_eps).astype(np.int64)
        test_recon = recon + r_vec * self.eps

        grid_ok = np.array_equal(test_recon.view(np.uint64), seg.view(np.uint64))

        if grid_ok:
            res_int = r_vec
            fb_idx = np.empty(0, np.int32)
            fb_xor = np.empty(0, np.uint64)
        else:
            res_int = np.zeros(n, np.int64)
            fb_mask = test_recon.view(np.uint64) != seg.view(np.uint64)
            fb_idx = np.where(fb_mask)[0].astype(np.int32)
            fb_xor = seg.view(np.uint64)[fb_mask] ^ recon.view(np.uint64)[fb_mask]
            res_int[~fb_mask] = r_vec[~fb_mask]

        # AR(1) on integer residuals
        alpha = 0.0
        if n > 2 and np.var(res_int) > 0:
            c = np.corrcoef(res_int[:-1], res_int[1:])[0,1]
            alpha = np.nan_to_num(c)
            alpha = np.clip(alpha, -0.999, 0.999)

        # Encode prediction errors
        err_stream = np.empty(n, np.int64)
        if abs(alpha) < 1e-9:
            err_stream[:] = res_int
        else:
            err_stream[0] = res_int[0]
            for i in range(1, n):
                pred = int(alpha * res_int[i-1])
                err_stream[i] = res_int[i] - pred

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

        for _ in range(self.passes):
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

        seams = [0] + self._seams(x) + [len(x)]
        segments_meta = []
        q_parts = []
        e_parts = []

        for i in range(len(seams)-1):
            s, e = seams[i], seams[i+1]
            qinfo = self._quantize_segment(x[s:e])
            segments_meta.append({
                "s": s, "e": e, "centers": qinfo["centers"],
                "alpha": qinfo["alpha"], "fb_idx": qinfo["fb_idx"], "fb_xor": qinfo["fb_xor"]
            })
            q_parts.append(qinfo["q_idx"])
            e_parts.append(qinfo["err_stream"])

        q_stream = np.concatenate(q_parts).astype(np.uint16)
        e_stream = np.concatenate(e_parts).astype(np.int64)

        payload = {
            "q_compressed": zstd.compress(q_stream.tobytes(), self.zstd_level),
            "e_compressed": zstd.compress(e_stream.tobytes(), self.zstd_level),
            "segments": segments_meta,
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
            q_idx = q_stream[q_ptr:q_ptr+length]
            err_stream = e_stream[e_ptr:e_ptr+length]
            q_ptr += length
            e_ptr += length

            centers = seg["centers"].view(np.float64)
            alpha = seg["alpha"]

            # Correct AR(1) reconstruction
            res_int = np.empty(length, np.int64)
            if abs(alpha) < 1e-9:
                res_int[:] = err_stream
            else:
                res_int[0] = err_stream[0]
                for i in range(1, length):
                    pred = int(alpha * res_int[i-1])
                    res_int[i] = err_stream[i] + pred

            recon = centers[q_idx] + res_int * payload["eps"]

            if seg["fb_idx"].size > 0:
                recon.view(np.uint64)[seg["fb_idx"]] ^= seg["fb_xor"]

            x[s:e] = recon

        for idx in reversed(payload["flips"]):
            x[idx:] = -x[idx:]

        return x

    @staticmethod
    def verify_bitperfect(a, b):
        a = np.asarray(a, dtype=np.float64)
        b = np.asarray(b, dtype=np.float64)
        return np.array_equal(a.view(np.uint64), b.view(np.uint64))
