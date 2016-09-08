"use strict";

// Analysis paramters
const alphabet = 'abcdefghijklmnopqrstuvwxyz',
    letters = alphabet.split('');
/**
 * Counts the occurences of substrings within a list of lower-case strings.
 * Results are deduplicated to remove shorter strings with same occurence. Only
 * builds substrings out of lower-case latin letters (a-z).
 *
 * The tree is traversed per generation, so per iteration all children to the
 * previous leaves are checked.
 *
 * @param {Array.<string>} allNames - Lower-case strings to search in.
 * @param {number} minLength - Minimum length of the substrings to find. Must
 *                             be 1 or bigger. Increasing this makes this
 *                             run faster.
 * @param {number} [minOccurences=2] - Minimum number of occurences to look for.
 *                                     increasing this may significantly improve
 *                                     speed.
 * @returns {Object.<string, number>} Map of substrings and their occurence
 *                                    count. Only contains the longest variant
 *                                    of a substring if their occurence is the
 *                                    same. So for example if all "al" are
 *                                    followed by "r", it will only contain
 *                                    "alr" and not "al".
 */
const getOccurences = (allNames, minLength, minOccurences = 2) => {
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
    if(minLength == 1) {
        for(const l in eligibleNames) {
            counts[l] = eligibleNames[l].length;
        }
    }

    const eligibleLetters = {},
        futureLetters = new Set();
    let futureNames,
        words = Object.keys(eligibleNames),
        futureWords = [],
        wordLength = 1,
        count;

    const lttrs = (b, letter) => {
        futureLetters.clear();
        const word = b + letter;
        count = 0;
        futureNames = eligibleNames[b].filter((n) => {
            const i = n.indexOf(word);
            if(i > -1) {
                ++count;
                const l = n[i + word.length];
                if(l && alphabet.includes(l)) {
                    futureLetters.add(l);
                    return true;
                }
            }
            return false;
        });
        if(count >= minOccurences) {
            if(futureLetters.size > 0) {
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
                    const a = word.substr(1);
                    if(counts[a] == count) {
                        delete counts[a];
                    }
                }
            }
        }
    };
    const wrds = (b) => {
        const a = wordLength > 2 ? eligibleLetters[b] : letters;
        a.forEach((l) => lttrs(b, l));
    };

    while(words.length > 0) {
        futureWords = [];
        ++wordLength;
        words.forEach(wrds);
        words = futureWords;
    }

    return counts;
};

module.exports = getOccurences;
