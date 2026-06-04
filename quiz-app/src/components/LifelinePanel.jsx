import './LifelinePanel.css';

const LIFELINES = [
  { id: 'general', label: 'General Round', bg: '/assets/screen5/1933951a910793eed4e446c48517fc61101aec62.png' },
  { id: 'audience', label: 'ASK Audience', bg: '/assets/screen5/baf04acb213e993edd1f5da201c412df2e7df937.png' },
  { id: 'fifty', label: '50:50', bg: '/assets/screen5/137bc6fb0314fdb92e1d600ec2d7b37e3a9b9ebb.png' },
  { id: 'timer', label: 'Timer Round', bg: '/assets/screen5/1933951a910793eed4e446c48517fc61101aec62.png' },
  { id: 'buzzer', label: 'Buzzer Round', bg: '/assets/screen5/1933951a910793eed4e446c48517fc61101aec62.png' }
];

export default function LifelinePanel({
  activeLifeline = 'general',
  usedLifelines = [],
  onUseLifeline
}) {
  return (
    <div className="lifeline-panel">
      {LIFELINES.map((lifeline) => {
        const isActive = activeLifeline === lifeline.id;
        const isUsed = usedLifelines.includes(lifeline.id);

        return (
          <div
            key={lifeline.id}
            className={`lifeline-item ${isActive ? 'lifeline-item--active' : ''} ${
              isUsed ? 'lifeline-item--used' : ''
            }`}
            onClick={() => !isUsed && onUseLifeline && onUseLifeline(lifeline.id)}
          >
            <img
              className="lifeline-item__bg"
              src={lifeline.bg}
              alt=""
              aria-hidden="true"
            />
            <span className="lifeline-item__text">{lifeline.label}</span>
          </div>
        );
      })}
    </div>
  );
}
