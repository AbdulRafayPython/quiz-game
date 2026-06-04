import './BackButton.css';

export default function BackButton({ onClick }) {
  return (
    <button className="back-button" onClick={onClick} id="back-button">
      <img
        className="back-button__img"
        src="/assets/screen3/Back Button.png"
        alt="Go Back"
      />
    </button>
  );
}
