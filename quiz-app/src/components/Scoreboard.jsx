import './Scoreboard.css';

const LADDER_VALUES = [
  { level: 10, points: '10,000,000' },
  { level: 9, points: '1,000,000' },
  { level: 8, points: '100,000' },
  { level: 7, points: '10,000' },
  { level: 6, points: '1,000' },
  { level: 5, points: '500' },
  { level: 4, points: '100' },
  { level: 3, points: '50' },
  { level: 2, points: '30' },
  { level: 1, points: '10' }
];

export default function Scoreboard({ currentLevel = 1, totalScore = 0 }) {
  return (
    <div className="scoreboard">
      <div className="scoreboard__header">
        <img
          className="scoreboard__header-bg"
          src="/assets/screen5/f948e02d425ca531b710ec22472b294b9c532ab9.png"
          alt=""
          aria-hidden="true"
        />
        <span className="scoreboard__header-title">
          {totalScore.toLocaleString()} PTS
        </span>
      </div>

      <div className="score-ladder">
        {LADDER_VALUES.map((tier) => {
          const isActive = currentLevel === tier.level;
          const isCompleted = currentLevel > tier.level;
          return (
            <div
              key={tier.level}
              className={`score-tier ${isActive ? 'score-tier--active' : ''} ${
                isCompleted ? 'score-tier--completed' : ''
              }`}
            >
              <div className="score-tier__num-container">
                <img
                  className="score-tier__num-bg"
                  src="/assets/screen5/fd443d0eaf8537d4b27dcab94b1006e1ccbf3d54.png"
                  alt=""
                  aria-hidden="true"
                />
                <span className="score-tier__num">{tier.level}</span>
              </div>

              <div className="score-tier__val-container">
                <img
                  className="score-tier__val-bg"
                  src="/assets/screen5/3f0ffa2fc0e319931f07073b6f1af59bb8660ca0.png"
                  alt=""
                  aria-hidden="true"
                />
                <span className="score-tier__points">{tier.points}</span>
                <span className="score-tier__pts">PTS</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
