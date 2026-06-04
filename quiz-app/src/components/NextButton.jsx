import './NextButton.css';

export default function NextButton({ onClick }) {
  return (
    <button className="next-button" onClick={onClick} id="next-button">
      <img
        className="next-button__img"
        src="/assets/screen6/Next.png"
        alt="Next"
      />
    </button>
  );
}
