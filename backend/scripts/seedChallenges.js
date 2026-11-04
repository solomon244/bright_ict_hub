/* Usage: npm run seed:challenges   — idempotent (upserts by slug). */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDatabase = require('../src/config/db');
const CodingChallenge = require('../src/models/CodingChallenge');

const challenges = [
  {
    slug: 'sum-of-numbers', title: 'Sum of numbers', titleAm: 'የቁጥሮች ድምር', difficulty: 'beginner', functionName: 'sum',
    description: 'Write a function `sum(numbers)` that returns the total of all numbers in the array. An empty array returns 0.',
    starterCode: 'function sum(numbers) {\n  // your code here\n}\n',
    tests: [{ args: [[1, 2, 3]], expected: 6 }, { args: [[]], expected: 0 }, { args: [[10, -4, 5]], expected: 11 }],
  },
  {
    slug: 'reverse-a-string', title: 'Reverse a string', titleAm: 'ጽሑፍን መገልበጥ', difficulty: 'beginner', functionName: 'reverseString',
    description: 'Write `reverseString(text)` that returns the text written backwards. Example: "abc" becomes "cba".',
    starterCode: 'function reverseString(text) {\n  // your code here\n}\n',
    tests: [{ args: ['abc'], expected: 'cba' }, { args: [''], expected: '' }, { args: ['Ethiopia'], expected: 'aipoihtE' }],
  },
  {
    slug: 'is-even', title: 'Even or odd', titleAm: 'ተራ ወይስ ሙሉ ቁጥር', difficulty: 'beginner', functionName: 'isEven',
    description: 'Write `isEven(n)` that returns true when the whole number n is even and false when it is odd.',
    starterCode: 'function isEven(n) {\n  // your code here\n}\n',
    tests: [{ args: [4], expected: true }, { args: [7], expected: false }, { args: [0], expected: true }, { args: [-3], expected: false }],
  },
  {
    slug: 'find-the-largest', title: 'Find the largest', titleAm: 'ትልቁን ቁጥር ፈልግ', difficulty: 'beginner', functionName: 'largest',
    description: 'Write `largest(numbers)` that returns the biggest number in a non-empty array.',
    starterCode: 'function largest(numbers) {\n  // your code here\n}\n',
    tests: [{ args: [[3, 9, 2]], expected: 9 }, { args: [[-5, -1, -8]], expected: -1 }, { args: [[7]], expected: 7 }],
  },
  {
    slug: 'fizzbuzz', title: 'FizzBuzz', titleAm: 'ፊዝባዝ', difficulty: 'intermediate', functionName: 'fizzBuzz',
    description: 'Write `fizzBuzz(n)` that returns an array for the numbers 1..n: "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for both, otherwise the number itself.',
    starterCode: 'function fizzBuzz(n) {\n  // your code here\n}\n',
    tests: [{ args: [5], expected: [1, 2, 'Fizz', 4, 'Buzz'] }, { args: [15], expected: [1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz'] }, { args: [1], expected: [1] }],
  },
  {
    slug: 'palindrome-check', title: 'Palindrome check', titleAm: 'ፓሊንድሮም', difficulty: 'intermediate', functionName: 'isPalindrome',
    description: 'Write `isPalindrome(text)` that returns true if the text reads the same forwards and backwards, ignoring upper/lower case and spaces.',
    starterCode: 'function isPalindrome(text) {\n  // your code here\n}\n',
    tests: [{ args: ['level'], expected: true }, { args: ['Never odd or even'], expected: true }, { args: ['hello'], expected: false }],
  },
];

(async () => {
  await connectDatabase();
  for (const c of challenges) {
    await CodingChallenge.updateOne({ slug: c.slug }, { $set: { ...c, language: 'javascript', isPublished: true } }, { upsert: true });
    console.log(`✔ ${c.slug}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
