// Generates supabase/seed.sql — a re-runnable seed of many ready-to-play quizzes.
// Author the quizzes in JS below (readable), then run `node scripts/seed-quizzes.mjs`
// to (re)write the SQL. Paste the resulting supabase/seed.sql into the Supabase
// SQL editor and run it. Each quiz's 10 questions cycle the 5 round types.
import { writeFileSync } from 'fs';

// quiz name -> [ [questionText, [4 options], correctIndex], ... ]
const QUIZZES = {
  'Science Quiz': [
    ['What is the chemical formula of water?', ['CO2', 'O2', 'H2O', 'NaCl'], 2],
    ['Which planet is known as the Red Planet?', ['Earth', 'Mars', 'Jupiter', 'Saturn'], 1],
    ['What is the hardest natural substance on Earth?', ['Gold', 'Iron', 'Diamond', 'Platinum'], 2],
    ['What gas do plants absorb during photosynthesis?', ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], 1],
    ['How many bones are in an adult human body?', ['186', '206', '216', '226'], 1],
    ['What is the center of an atom called?', ['Proton', 'Electron', 'Nucleus', 'Neutron'], 2],
    ["What is the most abundant gas in Earth's atmosphere?", ['Oxygen', 'Nitrogen', 'CO2', 'Argon'], 1],
    ['What is the boiling point of water in Celsius?', ['90', '100', '110', '120'], 1],
    ['What is the powerhouse of the cell?', ['Nucleus', 'Ribosome', 'Mitochondria', 'Lysosome'], 2],
    ['Who proposed the theory of relativity?', ['Newton', 'Einstein', 'Tesla', 'Curie'], 1],
  ],
  'Mathematics Quiz': [
    ['What is the square root of 144?', ['10', '11', '12', '13'], 2],
    ['What is the value of Pi to 2 decimal places?', ['3.12', '3.14', '3.16', '3.18'], 1],
    ['What is 7 multiplied by 8?', ['54', '56', '58', '62'], 1],
    ['How many degrees are in a right angle?', ['45', '90', '180', '360'], 1],
    ['What is the next prime number after 7?', ['9', '11', '13', '15'], 1],
    ['Solve: 2 + 2 x 2', ['4', '6', '8', '10'], 1],
    ['What is the Roman numeral for 50?', ['V', 'X', 'L', 'C'], 2],
    ['How many sides does a heptagon have?', ['6', '7', '8', '9'], 1],
    ['What is 15% of 200?', ['15', '20', '30', '40'], 2],
    ['If x + 5 = 12, what is x?', ['5', '7', '8', '9'], 1],
  ],
  'English Quiz': [
    ['Which of these is a noun?', ['Run', 'Beautiful', 'Happiness', 'Quickly'], 2],
    ["What is the antonym of 'Generous'?", ['Kind', 'Selfish', 'Happy', 'Polite'], 1],
    ['What is a group of lions called?', ['Pack', 'Herd', 'Pride', 'Flock'], 2],
    ['Choose the correct spelling:', ['Recieve', 'Receive', 'Receve', 'Recive'], 1],
    ["Who wrote 'Romeo and Juliet'?", ['Dickens', 'Shakespeare', 'Twain', 'Austen'], 1],
    ['Which sentence is in the past tense?', ['I run', 'I will run', 'I ran', 'I am running'], 2],
    ['A person who writes books is a(n)...', ['Actor', 'Author', 'Artist', 'Architect'], 1],
    ["What is a synonym for 'Huge'?", ['Tiny', 'Gigantic', 'Weak', 'Fast'], 1],
    ["What is the plural of 'child'?", ['Childs', 'Children', 'Childrens', 'Childes'], 1],
    ["A comparison using 'like' or 'as' is a...", ['Metaphor', 'Simile', 'Personification', 'Hyperbole'], 1],
  ],
  'Chemistry Quiz': [
    ['What is the atomic symbol for Gold?', ['Ag', 'Au', 'Fe', 'Cu'], 1],
    ['What is the pH level of pure water?', ['5', '7', '9', '11'], 1],
    ['Which element is a noble gas?', ['Oxygen', 'Hydrogen', 'Helium', 'Chlorine'], 2],
    ['What is the chemical formula for table salt?', ['H2O', 'CO2', 'NaCl', 'HCl'], 2],
    ['Which gas is produced when an acid reacts with a metal?', ['Oxygen', 'Hydrogen', 'CO2', 'Nitrogen'], 1],
    ['What is the atomic number of Carbon?', ['4', '6', '8', '12'], 1],
    ['A liquid turning into a gas is called?', ['Freezing', 'Melting', 'Evaporation', 'Condensation'], 2],
    ['Who is known as the father of modern chemistry?', ['Lavoisier', 'Mendeleev', 'Dalton', 'Curie'], 0],
    ['What is the chemical formula of Methane?', ['CO2', 'CH4', 'C2H6', 'H2O'], 1],
    ['Which particle has a negative charge?', ['Proton', 'Neutron', 'Electron', 'Nucleus'], 2],
  ],
  'General Knowledge Quiz': [
    ['Which is the largest planet in our solar system?', ['Earth', 'Jupiter', 'Mars', 'Venus'], 1],
    ['How many continents are there on Earth?', ['5', '6', '7', '8'], 2],
    ['What is the currency of Japan?', ['Won', 'Yuan', 'Yen', 'Ringgit'], 2],
    ['Which is the fastest land animal?', ['Lion', 'Cheetah', 'Horse', 'Leopard'], 1],
    ['Which is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3],
    ['How many colors are there in a rainbow?', ['5', '6', '7', '8'], 2],
    ['What is the national animal of Pakistan?', ['Lion', 'Markhor', 'Tiger', 'Deer'], 1],
    ['Who painted the Mona Lisa?', ['Van Gogh', 'Picasso', 'Da Vinci', 'Michelangelo'], 2],
    ['Which is the largest mammal in the world?', ['Elephant', 'Blue Whale', 'Giraffe', 'Hippo'], 1],
    ['How many days are there in a leap year?', ['365', '366', '367', '364'], 1],
  ],
  'Geography Quiz': [
    ['What is the capital of France?', ['Berlin', 'Madrid', 'Paris', 'Rome'], 2],
    ['Which is the longest river in the world?', ['Amazon', 'Nile', 'Yantgze', 'Ganges'], 1],
    ['Which is the largest hot desert in the world?', ['Sahara', 'Gobi', 'Thar', 'Kalahari'], 0],
    ['Which is the tallest mountain in the world?', ['K2', 'Everest', 'Kilimanjaro', 'Alps'], 1],
    ['Which country currently has the largest population?', ['USA', 'India', 'China', 'Russia'], 1],
    ['What is the capital of Japan?', ['Beijing', 'Seoul', 'Tokyo', 'Bangkok'], 2],
    ['On which continent is Egypt located?', ['Asia', 'Europe', 'Africa', 'Australia'], 2],
    ['Which is the smallest country in the world?', ['Monaco', 'Vatican City', 'Malta', 'Nauru'], 1],
    ['In which country is the Great Barrier Reef?', ['Brazil', 'Australia', 'India', 'Mexico'], 1],
    ['What is the capital of Italy?', ['Venice', 'Milan', 'Rome', 'Naples'], 2],
  ],
  'History Quiz': [
    ['Who was the first president of the USA?', ['Lincoln', 'Washington', 'Jefferson', 'Adams'], 1],
    ['In which year did World War II end?', ['1943', '1945', '1947', '1950'], 1],
    ['Who is credited with discovering America?', ['Magellan', 'Columbus', 'Vasco da Gama', 'Cook'], 1],
    ['In which year did Pakistan gain independence?', ['1947', '1948', '1945', '1950'], 0],
    ['The Great Pyramid of Giza was built by the?', ['Greeks', 'Romans', 'Egyptians', 'Persians'], 2],
    ['Who was the first man to walk on the moon?', ['Aldrin', 'Armstrong', 'Gagarin', 'Collins'], 1],
    ['The Taj Mahal was built by which emperor?', ['Akbar', 'Shah Jahan', 'Babur', 'Aurangzeb'], 1],
    ['In which year did World War I start?', ['1912', '1914', '1916', '1918'], 1],
    ['Who is the founder of Pakistan?', ['Iqbal', 'Jinnah', 'Liaquat', 'Ayub'], 1],
    ['Which ancient wonder is located in Egypt?', ['Colossus', 'Great Pyramid', 'Hanging Gardens', 'Lighthouse'], 1],
  ],
  'Computer Science Quiz': [
    ['What does CPU stand for?', ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Central Print Unit'], 1],
    ['What is the base of the binary number system?', ['2', '8', '10', '16'], 0],
    ['HTML is primarily used for?', ['Styling', 'Web page structure', 'Databases', 'Networking'], 1],
    ['Who invented the C programming language?', ['Dennis Ritchie', 'Bjarne Stroustrup', 'Guido van Rossum', 'James Gosling'], 0],
    ['What does RAM stand for?', ['Read Access Memory', 'Random Access Memory', 'Rapid Access Memory', 'Run Access Memory'], 1],
    ['Which of these is an operating system?', ['Chrome', 'Linux', 'Excel', 'Photoshop'], 1],
    ['How many bits are there in one byte?', ['4', '8', '16', '32'], 1],
    ['Which language adds interactivity to web pages?', ['Python', 'JavaScript', 'C++', 'Java'], 1],
    ['Who is the co-founder of Microsoft?', ['Steve Jobs', 'Bill Gates', 'Elon Musk', 'Jeff Bezos'], 1],
    ['What does WWW stand for?', ['World Web Wide', 'World Wide Web', 'Wide World Web', 'Web World Wide'], 1],
  ],
};

// Quiz-level defaults (scoring now follows the on-screen ladder, but the columns
// still need values).
const Q = { rounds: 5, timer: 25, timer_round_timer: 10, correct_points: 1000, penalty_points: 500 };

const esc = (s) => String(s).replace(/'/g, "''");

let sql = `-- AUTO-GENERATED by scripts/seed-quizzes.mjs — do not edit by hand.
-- Seeds ready-to-play quizzes. Safe to re-run: it removes these same-named
-- quizzes first (which cascade-deletes their questions) and re-inserts them.
-- Paste into the Supabase SQL editor and run.

begin;

delete from public.quizzes where name in (
${Object.keys(QUIZZES).map((n) => `  '${esc(n)}'`).join(',\n')}
);

`;

for (const [name, questions] of Object.entries(QUIZZES)) {
  const rows = questions.map(([text, opts, correct], i) => {
    const round = (i % 5) + 1; // cycle the 5 round types
    const optionsJson = esc(JSON.stringify(opts));
    return `  (${i}, '${esc(text)}', '${optionsJson}', ${correct}, ${round})`;
  });
  sql += `with q as (
  insert into public.quizzes (name, rounds, timer, timer_round_timer, correct_points, penalty_points)
  values ('${esc(name)}', ${Q.rounds}, ${Q.timer}, ${Q.timer_round_timer}, ${Q.correct_points}, ${Q.penalty_points})
  returning id
)
insert into public.questions (quiz_id, position, text, options, correct, round)
select q.id, t.position, t.text, t.options::jsonb, t.correct, t.round
from q cross join (values
${rows.join(',\n')}
) as t(position, text, options, correct, round);

`;
}

sql += 'commit;\n';

writeFileSync('supabase/seed.sql', sql);
const n = Object.keys(QUIZZES).length;
const q = Object.values(QUIZZES).reduce((a, v) => a + v.length, 0);
console.log(`Wrote supabase/seed.sql — ${n} quizzes, ${q} questions.`);
