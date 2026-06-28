// Generates supabase/seed.sql — a re-runnable seed of many ready-to-play quizzes.
// Author the quizzes in JS below (readable), then run `node scripts/seed-quizzes.mjs`
// to (re)write the SQL. Paste the resulting supabase/seed.sql into the Supabase
// SQL editor and run it.
//
// Each quiz declares the team count it is built for. Questions are grouped into
// the 5 round types (Buzzer, Timer, 50:50, Ask Audience, General) in equal-sized
// blocks of `teamCount`, so every round gives each team exactly one turn —
// i.e. a quiz has 5 × teamCount questions (10 for 2 teams, 15 for 3, … 30 for 6).
import { writeFileSync } from 'fs';

// { name, teamCount, questions: [ [questionText, [4 options], correctIndex], ... ] }
const QUIZZES = [
  {
    name: 'Science Quiz', teamCount: 2, questions: [
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
  },
  {
    name: 'Mathematics Quiz', teamCount: 2, questions: [
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
  },
  {
    name: 'English Quiz', teamCount: 2, questions: [
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
  },
  {
    name: 'Chemistry Quiz', teamCount: 2, questions: [
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
  },
  {
    name: 'General Knowledge Quiz', teamCount: 2, questions: [
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
  },
  {
    name: 'Geography Quiz', teamCount: 2, questions: [
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
  },
  {
    name: 'History Quiz', teamCount: 2, questions: [
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
  },
  {
    name: 'Computer Science Quiz', teamCount: 2, questions: [
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
  },

  // ── 3 TEAMS — 15 questions (3 per round) ──────────────────────────────────
  {
    name: 'World Explorer Challenge', teamCount: 3, questions: [
      ['What is the capital of Australia?', ['Sydney', 'Canberra', 'Melbourne', 'Perth'], 1],
      ['Which is the largest country by area?', ['Canada', 'China', 'USA', 'Russia'], 3],
      ['Which river flows through Egypt?', ['Amazon', 'Nile', 'Danube', 'Volga'], 1],
      ['The Eiffel Tower is located in?', ['Rome', 'Paris', 'London', 'Berlin'], 1],
      ['Mount Everest lies between Nepal and?', ['India', 'China', 'Bhutan', 'Pakistan'], 1],
      ['Which is the largest ocean?', ['Atlantic', 'Indian', 'Pacific', 'Arctic'], 2],
      ['The Statue of Liberty was a gift from?', ['Britain', 'France', 'Spain', 'Italy'], 1],
      ['Which country has a maple leaf on its flag?', ['USA', 'Canada', 'Brazil', 'Norway'], 1],
      ['On which continent is the Sahara Desert?', ['Asia', 'Africa', 'Australia', 'Europe'], 1],
      ['Which city is nicknamed the Big Apple?', ['Los Angeles', 'Chicago', 'New York', 'Boston'], 2],
      ['The Great Wall is located in which country?', ['Japan', 'China', 'India', 'Korea'], 1],
      ['Which is the smallest continent?', ['Europe', 'Antarctica', 'Australia', 'South America'], 2],
      ['What is the currency of the United Kingdom?', ['Euro', 'Dollar', 'Pound', 'Franc'], 2],
      ['Which country is shaped like a boot?', ['Spain', 'Italy', 'Greece', 'Portugal'], 1],
      ['Mount Fuji is located in?', ['China', 'Japan', 'Korea', 'Nepal'], 1],
    ],
  },

  // ── 4 TEAMS — 20 questions (4 per round) ──────────────────────────────────
  {
    name: 'Brain Buster Battle', teamCount: 4, questions: [
      ['How many legs does a spider have?', ['6', '8', '10', '12'], 1],
      ['What is H2O commonly known as?', ['Salt', 'Water', 'Sugar', 'Oxygen'], 1],
      ['Which animal is called the King of the Jungle?', ['Tiger', 'Elephant', 'Lion', 'Bear'], 2],
      ['How many days are in a week?', ['5', '6', '7', '8'], 2],
      ['Mixing blue and yellow makes which color?', ['Green', 'Purple', 'Orange', 'Brown'], 0],
      ['Which planet do we live on?', ['Mars', 'Venus', 'Earth', 'Jupiter'], 2],
      ['How many sides does a triangle have?', ['2', '3', '4', '5'], 1],
      ['What is the opposite of hot?', ['Warm', 'Cold', 'Cool', 'Mild'], 1],
      ['Which fruit is yellow and curved?', ['Apple', 'Banana', 'Grape', 'Cherry'], 1],
      ['How many hours are in a day?', ['12', '24', '36', '48'], 1],
      ['What do bees make?', ['Milk', 'Honey', 'Silk', 'Butter'], 1],
      ['Which is the fastest land animal?', ['Lion', 'Cheetah', 'Horse', 'Dog'], 1],
      ['How many colors are in a rainbow?', ['5', '6', '7', '8'], 2],
      ['Which gas do humans need to breathe?', ['Carbon Dioxide', 'Oxygen', 'Helium', 'Nitrogen'], 1],
      ['Which shape has four equal sides?', ['Triangle', 'Rectangle', 'Square', 'Circle'], 2],
      ['What is the largest mammal?', ['Elephant', 'Blue Whale', 'Giraffe', 'Shark'], 1],
      ['How many continents are there?', ['5', '6', '7', '8'], 2],
      ['Which season comes after winter?', ['Summer', 'Spring', 'Autumn', 'Monsoon'], 1],
      ['What is frozen water called?', ['Steam', 'Ice', 'Rain', 'Fog'], 1],
      ['How many minutes are in an hour?', ['30', '45', '60', '90'], 2],
    ],
  },

  // ── 5 TEAMS — 25 questions (5 per round) ──────────────────────────────────
  {
    name: 'Ultimate Trivia Clash', teamCount: 5, questions: [
      ['Who painted the Mona Lisa?', ['Picasso', 'Da Vinci', 'Van Gogh', 'Monet'], 1],
      ['What is the chemical symbol for oxygen?', ['O', 'Ox', 'Og', 'On'], 0],
      ['In which year did man first land on the moon?', ['1965', '1969', '1971', '1975'], 1],
      ['What is the hardest natural substance?', ['Gold', 'Diamond', 'Iron', 'Quartz'], 1],
      ['How many planets are in our solar system?', ['7', '8', '9', '10'], 1],
      ["Who wrote 'Hamlet'?", ['Dickens', 'Shakespeare', 'Tolstoy', 'Twain'], 1],
      ['Which metal is liquid at room temperature?', ['Iron', 'Mercury', 'Copper', 'Lead'], 1],
      ['What is the largest organ in the human body?', ['Heart', 'Liver', 'Skin', 'Lung'], 2],
      ['The Pyramids of Giza are located in?', ['Mexico', 'Egypt', 'Iraq', 'Greece'], 1],
      ['Which gas makes up most of the air?', ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], 1],
      ['Who developed the law of gravity?', ['Einstein', 'Newton', 'Galileo', 'Tesla'], 1],
      ['What is the smallest unit of life?', ['Atom', 'Cell', 'Molecule', 'Tissue'], 1],
      ['How many bones are in the adult human body?', ['196', '206', '216', '226'], 1],
      ['Which planet is closest to the Sun?', ['Venus', 'Mercury', 'Earth', 'Mars'], 1],
      ['Which language has the most native speakers?', ['English', 'Hindi', 'Mandarin Chinese', 'Spanish'], 2],
      ['What is the freezing point of water in Celsius?', ['0', '10', '32', '100'], 0],
      ['Who discovered penicillin?', ['Fleming', 'Pasteur', 'Curie', 'Darwin'], 0],
      ['What is the tallest animal?', ['Elephant', 'Giraffe', 'Horse', 'Ostrich'], 1],
      ['Which ocean is the deepest?', ['Atlantic', 'Pacific', 'Indian', 'Arctic'], 1],
      ['Which instrument has 88 keys?', ['Guitar', 'Piano', 'Violin', 'Flute'], 1],
      ['Which country invented paper?', ['Egypt', 'China', 'India', 'Greece'], 1],
      ['What is the powerhouse of the cell?', ['Nucleus', 'Mitochondria', 'Ribosome', 'Membrane'], 1],
      ['How many strings does a standard guitar have?', ['4', '5', '6', '7'], 2],
      ['What is the national flower of Japan?', ['Rose', 'Cherry Blossom', 'Lotus', 'Tulip'], 1],
      ['What is the speed of light approximately?', ['300 km/s', '300,000 km/s', '30 km/s', '3,000 km/s'], 1],
    ],
  },

  // ── 6 TEAMS — 30 questions (6 per round) ──────────────────────────────────
  {
    name: 'Mega Quiz Marathon', teamCount: 6, questions: [
      ['What is the capital of Spain?', ['Barcelona', 'Madrid', 'Seville', 'Valencia'], 1],
      ['How many players are on a soccer team?', ['9', '10', '11', '12'], 2],
      ['What is the largest planet?', ['Earth', 'Saturn', 'Jupiter', 'Neptune'], 2],
      ['Who is known as the Father of Computers?', ['Babbage', 'Turing', 'Gates', 'Jobs'], 0],
      ['What is the boiling point of water in Celsius?', ['90', '100', '110', '120'], 1],
      ['Which is the largest big cat?', ['Lion', 'Tiger', 'Leopard', 'Jaguar'], 1],
      ['What is the currency of the USA?', ['Pound', 'Euro', 'Dollar', 'Yen'], 2],
      ['How many sides does a hexagon have?', ['5', '6', '7', '8'], 1],
      ['Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1],
      ["Who wrote 'Romeo and Juliet'?", ['Shakespeare', 'Dickens', 'Austen', 'Poe'], 0],
      ['What is the chemical formula of table salt?', ['H2O', 'NaCl', 'CO2', 'O2'], 1],
      ['Which is the longest river in the world?', ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], 1],
      ['How many colors are on a chessboard?', ['1', '2', '3', '4'], 1],
      ['What do you call a baby dog?', ['Kitten', 'Puppy', 'Calf', 'Foal'], 1],
      ['Which continent is the coldest?', ['Asia', 'Antarctica', 'Europe', 'Africa'], 1],
      ['What is 9 multiplied by 9?', ['72', '81', '90', '99'], 1],
      ['Which vitamin do we get from sunlight?', ['Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin K'], 2],
      ['What is the capital of Canada?', ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'], 2],
      ['Which sea creature has eight arms?', ['Squid', 'Octopus', 'Jellyfish', 'Crab'], 1],
      ['How many wheels does a standard car have?', ['2', '3', '4', '6'], 2],
      ['What is the tallest mountain on Earth?', ['K2', 'Everest', 'Kangchenjunga', 'Lhotse'], 1],
      ['Which bird cannot fly?', ['Sparrow', 'Eagle', 'Penguin', 'Parrot'], 2],
      ['Which is the largest ocean?', ['Atlantic', 'Indian', 'Pacific', 'Arctic'], 2],
      ['How many teeth does an adult human have?', ['28', '30', '32', '34'], 2],
      ['What is the main language spoken in Brazil?', ['Spanish', 'Portuguese', 'English', 'French'], 1],
      ['Which metal is the best conductor of electricity?', ['Iron', 'Silver', 'Gold', 'Copper'], 1],
      ['What is the freezing point of water in Fahrenheit?', ['0', '32', '100', '212'], 1],
      ['Who invented the light bulb?', ['Edison', 'Tesla', 'Bell', 'Franklin'], 0],
      ['How many zeros are in one million?', ['4', '5', '6', '7'], 2],
      ['What is the smallest prime number?', ['0', '1', '2', '3'], 2],
    ],
  },
];

// Quiz-level defaults (scoring now follows the on-screen ladder, but the columns
// still need values). `rounds` is the number of round types in play.
const Q = { rounds: 5, timer: 25, timer_round_timer: 10, correct_points: 1000, penalty_points: 500 };

const esc = (s) => String(s).replace(/'/g, "''");

let sql = `-- AUTO-GENERATED by scripts/seed-quizzes.mjs — do not edit by hand.
-- Seeds ready-to-play quizzes. Safe to re-run: it removes these same-named
-- quizzes first (which cascade-deletes their questions) and re-inserts them.
-- Requires the team_count column from schema.sql — run schema.sql first.
-- Paste into the Supabase SQL editor and run.

begin;

delete from public.quizzes where name in (
${QUIZZES.map((qz) => `  '${esc(qz.name)}'`).join(',\n')}
);

`;

for (const { name, teamCount, questions } of QUIZZES) {
  const rows = questions.map(([text, opts, correct], i) => {
    // Group questions into equal blocks of teamCount, one block per round type,
    // so each round gives every team exactly one turn.
    const round = (Math.floor(i / teamCount) % 5) + 1;
    const optionsJson = esc(JSON.stringify(opts));
    return `  (${i}, '${esc(text)}', '${optionsJson}', ${correct}, ${round})`;
  });
  sql += `with q as (
  insert into public.quizzes (name, rounds, team_count, timer, timer_round_timer, correct_points, penalty_points)
  values ('${esc(name)}', ${Q.rounds}, ${teamCount}, ${Q.timer}, ${Q.timer_round_timer}, ${Q.correct_points}, ${Q.penalty_points})
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
const n = QUIZZES.length;
const q = QUIZZES.reduce((a, v) => a + v.questions.length, 0);
console.log(`Wrote supabase/seed.sql — ${n} quizzes, ${q} questions.`);
