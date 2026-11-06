/* ============================================================
   ★ THIS IS THE ONLY FILE YOU NEED TO EDIT ★
   Everything else reads from here. Edit the text, swap the images.
   ============================================================ */

const NAME = "Sakshi";

// Her birthday. Used to work out the age shown on the landing page.
const BIRTH_DATE = "2001-09-08";

// Questions about the two of you. `answer` is the index (0-3) of the right one.
// Edit freely — the game adapts to however many you write.
const QUIZ = [
  {
    q: "Where did I hold your hand for the first time?",
    options: [
      "In the temple",
      "In college",
      "On the bike, while it was raining",
      "In the auto rickshaw",
    ],
    answer: 2,
    // shown after she gets it right
    note: "in the rain. I still remember exactly how that felt.",
  },
  {
    q: "How long did we talk before meeting properly?",
    options: ["A few weeks", "Six months", "About a year and a half", "Two years"],
    answer: 2,
    note: "all of it online. every single day.",
  },
  {
    // Another open one — no wrong answer, a reply for each choice.
    q: "What is your favourite place to go with me?",
    options: [
      "For shopping",
      "The temple",
      "On a vacation",
      "Everywhere in the world",
    ],
    answer: "any",
    note: [
      "you take forever and I don't mind even a little.",
      "where it started. I'd go back every week.",
      "let's actually do it this year. properly.",
      "then everywhere it is. I'm taking you.",
    ],
  },
  {
    q: "What was the first thing we ever ate together?",
    options: ["Momos", "Chai and samosa", "Ice cream", "Pizza"],
    answer: 0,
    note: "momos. of course it was momos.",
  },
  {
    // No wrong answer here — `answer: "any"` accepts whatever she picks,
    // and `note` is one reply per option, in the same order.
    q: "What do you like the most about us together?",
    options: [
      "How easy it is",
      "That we can be completely ourselves",
      "How much we laugh",
      "That we always find our way back",
    ],
    answer: "any",
    note: [
      "it really is. it never felt like work with you.",
      "you saw the worst of me and stayed. that's the whole thing.",
      "you laugh at my worst jokes and I will never get over it.",
      "twice now. I'm not planning on a third.",
    ],
  },
];

// The scrolling intro on the first page. One entry per photo.
// Images live in assets/story/ — replace s1.svg…s6.svg with your own
// (jpg/png/svg all work, just update `img` to match the filename).
// Add or remove entries freely; the page builds one panel per entry.
const STORY = [
  {
    img: "assets/story/s1.jpg",
    title: "2022",
    text: "we met in college. same classes, same rooms — and somehow we barely said a word to each other.",
  },
  {
    img: "assets/story/s2.jpg",
    title: "then, everything",
    text: "a year and a half of talking. never in person, not once. just words on a screen, every day, until they became the best part of it.",
  },
  {
    img: "assets/story/s3-temple.jpg",
    wide: true,          // this panel runs wider than the rest
    title: "the temple",
    text: "you finished work and I came to see you. we went to the temple. after all that time, you were finally standing in front of me.",
  },
  {
    img: "assets/story/s4.jpg",
    title: "this face",
    text: "somewhere in all those messages you stopped performing and just started being yourself with me. this is that version of you. it's my favourite one.",
  },
  {
    img: "assets/story/s5.jpg",
    title: "then the quiet",
    text: "life got complicated and we stopped. that was the hardest part — knowing you were out there somewhere, not talking to me.",
  },
  {
    img: "assets/story/s6.jpg",
    title: "June 2026",
    text: "and then you were back. we've never been closer than we are now. I'm not letting that go again.",
  },
  {
    img: "assets/story/s7-last.jpg",
    title: "so — happy birthday",
    text: "keep scrolling. I made you something. ♡",
  },
];

// Your letter. Each string is one paragraph.
const LETTER = [
  `Happy birthday, my ${NAME}.`,
  `You are the best thing in my life. Not one of the best — the best.`,
  `I love how you laugh. I love how you say my name. I love that you let me see you exactly as you are, and that you've never once made me feel like I had to be anything other than myself.`,
  `Every day with you is my favourite day. Even the boring ones. Especially the boring ones.`,
  `I hope this year gives you everything — every single thing you quietly want and never ask for.`,
  `I love you. So much. More than I know how to write down.`,
  `Yours, always. ♡`,
];

// Captions for the polaroid wall at the end, in order p1 -> p8.
const CAPTIONS = [
  "college, before we knew",
  "all those messages",
  "you, back then",
  "you now",
  "us ♡",
  "that face you make",
  "june, on a call ♡",
];

// --- derived, don't edit ---
const BALLOON_LETTERS = NAME.replace(/\s/g, "").toUpperCase().split("");

const AGE = (() => {
  const b = new Date(BIRTH_DATE);
  const now = new Date();
  const age = now.getFullYear() - b.getFullYear();
  // Not had the birthday yet this year → still the previous age.
  // On the birthday itself, counts as the new age.
  const beforeBirthday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  return beforeBirthday ? age - 1 : age;
})();

// Number of photos the site expects in assets/photos/ (p1.jpg … p8.jpg)
// How many photos are in assets/photos/ as p1.jpg, p2.jpg, …
// Bump this as you add more; the polaroid wall and the memory game both follow it.
const PHOTO_COUNT = 7;
