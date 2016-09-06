"use strict";

const twitchbots = require("twitchbots-node");
const generator = require("combination-generator/generator");
const Table = require("cli-table");
const colors = require("colors/safe");
const fs = require("mz/fs");
const co = require("co");

const start = Date.now();

const cacheFile = "bots.json";

const info = (str) => console.log(colors.grey(str + "..."));

const getBots = co.wrap(function* () {
    const exists = yield fs.exists(cacheFile);
    if(exists) {
        info("Loading from cached file");
        const contents = yield fs.readFile(cacheFile, 'utf8');
        return JSON.parse(contents);
    }
    else {
        info("Fetching from the twitchbots.info API");
        const bots = yield twitchbots.getAllBots();
        yield fs.writeFile(cacheFile, JSON.stringify(bots));
        return bots;
    }
});

info("Loading all bots from twitchbots.info");

// Analysis paramters
const minLength = 5;
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const letters = alphabet.split('');
const minOccurences = 3;
const startWordLength = minLength - 1;

getBots().then((bots) => {
    const findings = {};
    const names = bots.map((b) => b.username).filter((n) => n.length >= minLength);

    // Two bots can't have the same name, so at least a letter is probably different.
    const maxLength = Math.max.apply(Math, names.map((n) => n.length)) - 1;

    const wordCount = Math.pow(letters.length, startWordLength);

    console.log("Looking for words between", colors.blue(minLength), "and", colors.blue(maxLength), "characters.");

    info("Generating base words");
    console.log("This will only take about", colors.blue(Math.round(wordCount * Math.sqrt(names.length))), "iteration steps");

    const foundWordsByLength = (new Array(startWordLength)).fill(null);
    const nameCheck = (w, n) => {
        const i = n.indexOf(w);
        return i != -1 && i < n.length - w.length;
    };
    const generatedWords = generator(letters, startWordLength, startWordLength)
        .filter((w) => names.some(nameCheck.bind(null, w)));
    foundWordsByLength.push(generatedWords);

    console.log("Words to start with:", colors.blue(generatedWords.length), "(out of", colors.blue(wordCount), "possible words)");

    let eligibleNames, futureNames, futureEligibleNames, words, futureWords;

    info("Analysing word frequency");
    console.log("This will only take about", colors.blue(Math.round(Math.log(maxLength - minLength) * wordCount * Math.sqrt(names.length))), "iteration steps");

    const filterEligibleNames = (word, n) => n.includes(word);
    const lttrs = (b, letter) => {
        const word = b + letter;
        futureNames = eligibleNames.filter(filterEligibleNames.bind(null, word));
        const count = futureNames.length;
        if(count > minOccurences) {
            findings[word] = count;
            if(!Array.isArray(foundWordsByLength[word.length])) {
                foundWordsByLength[l] = [];
            }
            foundWordsByLength[word.length].push(word);
            futureWords.push(word);
            futureEligibleNames = futureEligibleNames.concat(futureNames);
        }
    };
    const wrds = (b) => {
        letters.forEach(lttrs.bind(null, b));
    };
    for(let word of foundWordsByLength[minLength - 1]) {
        eligibleNames = names;
        words = [ word ];
        while(eligibleNames.length > 0 && futureWords.length > 0) {
            futureEligibleNames = [];
            futureWords = [];
            words.forEach(wrds);
            eligibleNames = futureEligibleNames;
            words = futureWords;
        }
    }

    // Functions to use within iterations
    /*const filterNames = (l, n) => n.length >= l;
    const countOccurences = (word, p, c) => p + (c.includes(word) ? 1 : 0);
    const bw = (l, letter, b) => {
        const word = b + letter;
        const count = eligibleNames.reduce(countOccurences.bind(null, word), 0);
        if(count > minOccurences) {
            findings[word] = count;
            foundWordsByLength[l].push(word);
        }
    };
    const ltrs = (l, letter) => {
        foundWordsByLength[l - 1].forEach(bw.bind(null, l, letter));
    };

    for(let l = minLength; l <= maxLength && foundWordsByLength[l - 1].length > 0; ++l) {
        foundWordsByLength[l] = [];
        // Remove all names that are shorter than the length we're looking for.
        eligibleNames = eligibleNames.filter(filterNames.bind(null, l));

        console.log(colors.blue(eligibleNames.length), "names left for length", colors.blue(l));

        letters.forEach(ltrs.bind(null, l));

        if(foundWordsByLength[l].length == 0) {
            // No more words to be found, we're done here.
            break;
        }
    }*/

    // Take out shorter strings with same occurence count as longer string that
    // they are a substring of.
    for(let w = minLength + 1; w <= maxLength && foundWordsByLength[w].length > 0; ++w) {
        const prev = foundWordsByLength[w - 1];
        const curr = foundWordsByLength[w];

        for(const word of prev) {
            const longerWord = curr.find((a) => a.includes(word));
            if(findings[word] == findings[longerWord]) {
                delete findings[word];
            }
        }
    }

    info("Sorting results");
    const sortedResults = Object.keys(findings).sort((a, b) => findings[b] - findings[a]).slice(0, 20);

    info("Generating nice output table");
    const table = new Table({
        head: [ "Word", "Count", "Percentage" ]
    });

    table.push(...sortedResults.map((n) => [ n, findings[n], ((findings[n] / bots.length) * 100).toFixed(2) + "%" ]));

    console.log(table.toString());
    console.log("And it only took", colors.blue(Math.floor((Date.now() - start) / 1000)), "seconds to get here");
});
