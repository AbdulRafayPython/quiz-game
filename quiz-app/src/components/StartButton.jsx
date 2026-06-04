import './StartButton.css';

export default function StartButton({ onClick }) {
  return (
    <button className="start-button" onClick={onClick} id="start-button">
      <img
        className="start-button__bg"
        src="/assets/screen1/Start Button Component.png"
        alt="START"
      />
    </button>
  );
}
