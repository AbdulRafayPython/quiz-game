import './ResumeButton.css';

export default function ResumeButton({ text = 'RESUME', variant = 'orange', onClick }) {
  const isGreen = variant === 'green';
  return (
    <button
      className={`resume-button ${isGreen ? 'resume-button--green' : ''}`}
      onClick={onClick}
    >
      {text}
    </button>
  );
}
