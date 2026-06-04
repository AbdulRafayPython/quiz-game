import './GameBackground.css';

export default function GameBackground({ blurred = false }) {
  return (
    <div className={`game-background ${blurred ? 'game-background--blurred' : ''}`}>
      <img
        className="game-background__image"
        src="/assets/screen1/Background.webp"
        alt=""
        aria-hidden="true"
      />
      <div className="game-background__overlay" />
    </div>
  );
}
