import { useState, useEffect, useRef } from 'react';
import './Timer.css';

export default function Timer({ duration = 15, running = true, onTimeUp }) {
  const [time, setTime] = useState(duration);
  const [prevDuration, setPrevDuration] = useState(duration);
  const intervalRef = useRef(null);

  // Reset the countdown when duration changes (adjust state during render —
  // the React-recommended alternative to a setState-in-effect).
  if (duration !== prevDuration) {
    setPrevDuration(duration);
    setTime(duration);
  }

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running, onTimeUp]);

  const statusClass = time <= 3 ? 'timer--critical' : time <= 5 ? 'timer--warning' : '';

  return (
    <div className={`timer ${statusClass}`} id="timer">
      <img
        className="timer__bg"
        src="/assets/screen5/58215ee57f78277b8955f3423c7a5a0057389d7d.png"
        alt=""
        aria-hidden="true"
      />
      <span className="timer__value">{time}</span>
    </div>
  );
}
