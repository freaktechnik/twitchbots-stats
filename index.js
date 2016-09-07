"use strict";

const twitchbots = require("twitchbots-node");
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

getBots().then((bots) => {
    const findings = new Map();
    const names = bots.map((b) => b.username).filter((n) => n.length >= minLength);

    // Two bots can't have the same name, so at least a letter is probably different.
    const maxLength = Math.max.apply(Math, names.map((n) => n.length)) - 1;

    console.log("Looking for words between", colors.blue(minLength), "and", colors.blue(maxLength), "characters.");

    info("Generating base words");

    const foundWordsByLength = [ null, null ];

    const eligibleNames = {};
    let futureNames = [],
        words = [],
        futureWords = [],
        wordLength = 1;

    names.forEach((n) => {
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

    info("Analysing word frequency");

    const filterEligibleNames = (word, n) => n.includes(word);
    const lttrs = (b, letter) => {
        const word = b + letter;
        futureNames = eligibleNames[b].filter(filterEligibleNames.bind(null, word));
        if(futureNames.length > minOccurences) {
            if(wordLength >= minLength) {
                findings.set(word, futureNames.length);
            }
            futureWords.push(word);
            eligibleNames[word] = futureNames;
        }
    };
    const wrds = (b) => {
        letters.forEach(lttrs.bind(null, b));
    };

    words = Object.keys(eligibleNames);
    while(words.length > 0) {
        futureWords = [];
        ++wordLength;
        words.forEach(wrds);
        if(futureWords.length > 0) {
            if(foundWordsByLength.length == wordLength) {
                foundWordsByLength.push(futureWords);
            }
            else {
                foundWordsByLength[wordLength] = foundWordsByLength[wordLength].concat(futureWords);
            }
        }
        words = futureWords;
    }

    // Take out shorter strings with same occurence count as longer string that
    // they are a substring of.

    info("Removing shorter duplicates");
    for(let w = minLength + 1; w <= maxLength && Array.isArray(foundWordsByLength[w]) && foundWordsByLength[w].length > 0; ++w) {
        const prev = foundWordsByLength[w - 1];
        const curr = foundWordsByLength[w];

        for(const word of prev) {
            const longerWord = curr.find((a) => a.includes(word));
            if(findings.get(word) == findings.get(longerWord)) {
                findings.delete(word);
            }
        }
    }

    info("Sorting results");
    const sortedResults = Array.from(findings.keys()).sort((a, b) => findings.get(b) - findings.get(a)).slice(0, 20);

    info("Generating nice output table");
    const table = new Table({
        head: [ "Word", "Count", "Percentage" ]
    });

    table.push.apply(table, sortedResults.map((n) => [ n, findings.get(n), ((findings.get(n) / bots.length) * 100).toFixed(2) + "%" ]));

    console.log(table.toString());
    console.log("And it only took", colors.blue(((Date.now() - start) / 1000).toFixed(2)), "seconds to get here");
});
