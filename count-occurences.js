// Analysis paramters
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const letters = alphabet.split('');
// At least two matches, since one match is essentially equivalent to the whole
// name of the bot it matches.
const getOccurences = (allNames, minLength, minOccurences = 1) => {
    const eligibleNames = {},
        counts = {},
        startCounting = minLength == 1;

    // If we count the occurences of single letters it's faster to do that in
    // O(n*26) than to do it in the tree search.
    if(startCounting) {
        letters.forEach((l) => {
            counts[l] = 0;
        });
    }

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
                if(startCounting) {
                    ++counts[l];
                }
            }
        });
    });

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
                const letter = n[i + word.length];
                if(letter && alphabet.includes(letter)) {
                    futureLetters.add(letter);
                    return true;
                }
            }
            return false;
        });
        if(count > minOccurences) {
            futureWords.push(word);
            eligibleNames[word] = futureNames;
            eligibleLetters[word] = Array.from(futureLetters.values());

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
        if(wordLength > 2) {
            eligibleLetters[b].forEach((l) => lttrs(b, l));
        }
        else {
            letters.forEach((l) => lttrs(b, l));
        }
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
