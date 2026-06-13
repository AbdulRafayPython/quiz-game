# Game sounds

Audio cues used in gameplay (wired in `src/lib/sound.js`). Replace any file with
your own (keep the same name) and it plays automatically. A missing file just
means that cue is silent.

| File           | Cue        | When it plays                                                       |
|----------------|------------|---------------------------------------------------------------------|
| `music.mp3`    | music      | Loops quietly in the background for the whole game                   |
| `audience.mp3` | audience   | Teacher uses the **Ask Audience** lifeline (KBC crowd clip)          |
| `suspense.mp3` | suspense   | Loops after a team **locks an answer**, while the timer counts down  |
| `lock.mp3`     | lock       | The instant an answer is **locked in**                              |
| `correct.wav`  | correct    | Answer revealed and it was **correct**                              |
| `wrong.wav`    | wrong      | Answer revealed and it was **wrong** (or time ran out)              |

## Notes
- `music.mp3` and `suspense.mp3` are looped — use clips that loop cleanly.
- Background music plays at low volume (0.22) so it doesn't drown the cues; tweak
  per-cue volume in `src/lib/sound.js`.
- Browsers block audio until the first click/tap, so music starts once the user
  has interacted with the page (which they have by the time gameplay begins).
- Supply your own licensed clips — none are committed as copyrighted audio.
