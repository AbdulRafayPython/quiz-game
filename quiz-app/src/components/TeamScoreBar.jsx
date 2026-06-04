import './TeamScoreBar.css';

export default function TeamScoreBar({ teams = [], activeTeamIndex = 0 }) {
  return (
    <div className="team-score-bar">
      {teams.map((team, index) => {
        const isActive = activeTeamIndex === index;
        return (
          <div
            key={index}
            className={`team-score-card ${isActive ? 'team-score-card--active' : ''}`}
          >
            <img
              className="team-score-card__bg"
              src="/assets/screen5/0d30ac7ab477669fa628fd00404206aa70eac30c.webp"
              alt=""
              aria-hidden="true"
            />
            <span className="team-score-card__name">{team.name}</span>
            <span className="team-score-card__score">
              {team.score.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
