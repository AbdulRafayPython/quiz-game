import './QuestionPanel.css';

export default function QuestionPanel({
  question,
  options = [],
  selectedOption = null,
  onSelectOption,
  disabled = false
}) {
  // Option backgrounds from Screen 5:
  // Purple: 5ea6b4ffb170b2ebdc4731fd4bf6c7c9b1d743ec.png
  // Red: bfd84faa0f3329c8561d4976b20d744cbf8f75b1.png
  // Green: b9bdac337066697d023c95651ea5bc040f32f524.png
  // Yellow: 26e030ce75f37d7fa2d5e78e277a0be82b3d17e5.png
  const optionBgs = [
    '/assets/screen5/5ea6b4ffb170b2ebdc4731fd4bf6c7c9b1d743ec.webp', // Purple
    '/assets/screen5/bfd84faa0f3329c8561d4976b20d744cbf8f75b1.webp', // Red
    '/assets/screen5/b9bdac337066697d023c95651ea5bc040f32f524.webp', // Green
    '/assets/screen5/26e030ce75f37d7fa2d5e78e277a0be82b3d17e5.webp'  // Yellow
  ];

  return (
    <div className="question-panel">
      <div className="question-box">
        <img
          className="question-box__bg"
          src="/assets/screen5/9793bcfc622f57851711931d845ed67bcc868b52.webp"
          alt=""
          aria-hidden="true"
        />
        <h2 className="question-box__text">{question}</h2>
      </div>

      <div className="options-grid">
        {options.map((option, index) => {
          const isSelected = selectedOption === index;
          return (
            <button
              key={index}
              className={`option-btn ${isSelected ? 'option-btn--selected' : ''}`}
              onClick={() => onSelectOption && onSelectOption(index)}
              disabled={disabled}
            >
              <img
                className="option-btn__bg"
                src={optionBgs[index % 4]}
                alt=""
                aria-hidden="true"
              />
              <span className="option-btn__text">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
