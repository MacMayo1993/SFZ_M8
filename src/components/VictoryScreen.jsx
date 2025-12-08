import { COLORS } from '../constants/cube.js';
import { formatTime } from '../utils/cube.js';

/**
 * Victory screen component displayed when puzzle is solved
 * @param {Object} victory - Victory data with type and time
 * @param {number} moves - Number of moves taken
 * @param {Function} onPlayAgain - Callback for play again button
 */
export default function VictoryScreen({ victory, moves, onPlayAgain }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.9)' }}
    >
      <div
        className="p-8 border-4 border-black text-center"
        style={{ background: COLORS.white, boxShadow: '12px 12px 0px 0px #000' }}
      >
        {/* Badge */}
        <div
          className="inline-block px-4 py-2 border-4 border-black mb-4 -rotate-2"
          style={{ background: COLORS.secondary }}
        >
          <span className="font-black uppercase tracking-widest text-sm">VICTORY</span>
        </div>

        {/* Title */}
        <div className="text-5xl font-black uppercase tracking-tight mb-2">
          {victory.type}
        </div>

        {/* Time */}
        <div className="text-6xl font-black mb-4" style={{ color: COLORS.accent }}>
          {formatTime(victory.time)}
        </div>

        {/* Moves */}
        <div className="text-lg font-bold uppercase mb-6">{moves} MOVES</div>

        {/* Play Again Button */}
        <button
          onClick={onPlayAgain}
          className="px-8 py-3 font-black uppercase tracking-wide border-4 border-black transition-all duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none"
          style={{ background: COLORS.muted, boxShadow: '6px 6px 0px 0px #000' }}
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
