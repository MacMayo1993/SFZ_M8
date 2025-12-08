import { COLORS } from '../constants/cube.js';

/**
 * Menu component for WORM³ game
 * @param {Function} onStart - Callback when user selects a cube size
 */
export default function Menu({ onStart }) {
  const cubeSizes = [2, 3, 4, 5];
  const buttonColors = [COLORS.accent, COLORS.secondary, COLORS.muted, COLORS.white];

  return (
    <div
      className="min-h-screen p-8 flex flex-col"
      style={{ background: COLORS.bg, fontFamily: 'system-ui' }}
    >
      {/* Header */}
      <nav className="flex justify-between items-center mb-12 border-b-4 border-black pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-black" style={{ background: COLORS.accent }} />
          <div className="w-8 h-8 border-4 border-black rounded-full" style={{ background: COLORS.secondary }} />
          <div className="w-8 h-8 border-4 border-black rotate-45" style={{ background: COLORS.muted }} />
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12">
        <div className="max-w-lg">
          {/* Badge */}
          <div
            className="inline-block px-4 py-2 border-4 border-black mb-6 -rotate-2"
            style={{ background: COLORS.secondary, boxShadow: '4px 4px 0px 0px #000' }}
          >
            <span className="font-black uppercase tracking-widest text-sm">
              MANIFOLD PUZZLE
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-7xl lg:text-9xl font-black uppercase tracking-tighter leading-none mb-6"
            style={{ color: COLORS.black }}
          >
            WORM<sup className="text-4xl lg:text-5xl align-super">3</sup>
          </h1>

          {/* Description */}
          <p
            className="text-xl font-bold mb-10 leading-relaxed"
            style={{ color: COLORS.black }}
          >
            A topological puzzle where antipodal pairs are entangled. Flip tiles, twist layers,
            solve the manifold.
          </p>

          {/* Cube Size Selection */}
          <div className="grid grid-cols-2 gap-4">
            {cubeSizes.map((size, i) => (
              <button
                key={size}
                onClick={() => onStart(size)}
                className="py-5 text-xl font-black uppercase tracking-wide border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
                style={{
                  background: buttonColors[i],
                  color: COLORS.black,
                  boxShadow: '6px 6px 0px 0px #000'
                }}
              >
                {size}×{size} CUBE
              </button>
            ))}
          </div>
        </div>

        {/* Decorative Shapes */}
        <div className="relative w-72 h-72 hidden lg:block">
          <div
            className="absolute top-0 left-0 w-40 h-40 border-4 border-black rounded-full"
            style={{ background: COLORS.secondary, boxShadow: '8px 8px 0px 0px #000' }}
          />
          <div
            className="absolute bottom-0 right-0 w-36 h-36 border-4 border-black rotate-12"
            style={{ background: COLORS.accent, boxShadow: '8px 8px 0px 0px #000' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-4 border-black -rotate-6"
            style={{ background: COLORS.muted, boxShadow: '8px 8px 0px 0px #000' }}
          />
        </div>
      </div>
    </div>
  );
}
