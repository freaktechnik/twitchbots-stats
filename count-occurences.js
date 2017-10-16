"use strict";

// Analysis base data
const alphabet = 'abcdefghijklmnopqrstuvwxyz',
    letters = alphabet.split(''),
    MIN_OCCURENCES = 2,
    SINGLE_LETTER = 1,
    START = 0,
    NO_RESULT = -1;

/**
 * Counts the occurences of substrings within a list of lower-case strings.
 * Results are deduplicated to remove shorter strings with same occurence. Only
 * builds substrings out of lower-case latin letters (a-z).
 *
 * The tree is traversed per generation, so per iteration all children to the
 * previous leaves are checked.
 *
 * @param {[string]} allNames - Lower-case strings to search in.
 * @param {number} minLength - Minimum length of the substrings to find. Must
 *                             be 1 or bigger. Increasing this makes this
 *                             run faster.
 * @param {number} [minOccurences=2] - Minimum number of occurences to look for.
 *                                     increasing this may significantly improve
 *                                     speed.
 * @returns {Object.<number>} Map of substrings and their occurence count. Only
 *                            contains the longest variant of a substring if
 *                            their occurence is the same. So for example if all
 *                            "al" are followed by "r", it will only contain
 *                            "alr" and not "al".
 */
const getOccurences = (allNames, minLength, minOccurences = MIN_OCCURENCES) => {
    const eligibleNames = {},
        counts = {};

    allNames.forEach((n) => {
        if(n.length < minLength) {
            return;
        }
        letters.forEach((l) => {
            if(n.includes(l)) {
                if(!eligibleNames[l]) {
                    eligibleNames[l] = [ n ];
                }
                else {
                    eligibleNames[l].push(n);
                }
            }
        });
    });


    // If we count the occurences of single letters it's faster to do that in
    // O(n*26) than to do it in the tree search.
    if(minLength === SINGLE_LETTER) {
        for(const l in eligibleNames) {
            counts[l] = eligibleNames[l].length;
        }
    }

    const eligibleLetters = {},
        futureLetters = new Set();
    let futureNames,
        words = Object.keys(eligibleNames),
        futureWords = [],
        wordLength = SINGLE_LETTER,
        count;

    const lttrs = (b, letter) => {
        futureLetters.clear();
        const word = b + letter;
        count = START;
        futureNames = eligibleNames[b].filter((n) => {
            const i = n.indexOf(word);
            if(i > NO_RESULT) {
                ++count;
                // Get next character in word and save it for the next round.
                const l = n[i + word.length];
                if(l && alphabet.includes(l)) {
                    futureLetters.add(l);
                    return true;
                }
            }
            return false;
        });
        if(count >= minOccurences) {
            // Only visit this word again, if there's a chance of longer versions.
            if(futureLetters.size) {
                futureWords.push(word);
                eligibleNames[word] = futureNames;
                eligibleLetters[word] = Array.from(futureLetters.values());
            }

            if(wordLength >= minLength) {
                counts[word] = count;

                // Prune shorter substrings with the same count.
                if(wordLength > minLength) {
                    if(counts[b] == count) {
                        delete counts[b];
                    }
                    const a = word.substr(SINGLE_LETTER);
                    if(counts[a] == count) {
                        delete counts[a];
                    }
                }
            }
        }
    };
    const wrds = (b) => {
        const a = wordLength > MIN_OCCURENCES ? eligibleLetters[b] : letters;
        a.forEach((l) => lttrs(b, l));
    };

    while(words.length) {
        futureWords = [];
        ++wordLength;
        for(const b of words) {
            wrds(b);
        }
        words = futureWords;
    }

    return counts;
};

module.exports = getOccurences;
