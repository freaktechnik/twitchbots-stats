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
const minOccurences = 1;

getBots().then((bots) => {
    const names = bots.map((b) => b.username).filter((n) => n.length >= minLength);

    info("Generating base words");

    const foundWordsByLength = [ null, null ];

    const eligibleNames = {};

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

    const counts = {};
    let futureNames = [],
        words = Object.keys(eligibleNames),
        futureWords = [],
        wordLength = 1,
        eligibleLetters = {},
        futureLetters = new Set();

    const filterEligibleNames = (word, n) => {
        const i = n.indexOf(word);
        if(i != -1) {
            ++counts[word];
            const letter = n[i + word.length];
            if(letter && alphabet.includes(letter)) {
                futureLetters.add(letter);
                return true;
            }
        }
        return false;
    }
    const lttrs = (b, letter) => {
        const word = b + letter;
        futureLetters.clear();
        counts[word] = 0;
        futureNames = eligibleNames[b].filter(filterEligibleNames.bind(null, word));
        if(counts[word] > minOccurences) {
            futureWords.push(word);
            eligibleNames[word] = futureNames;
            eligibleLetters[word] = Array.from(futureLetters.values());
        }
    };
    const wrds = (b) => {
        if(b.length > 1) {
            eligibleLetters[b].forEach(lttrs.bind(null, b));
        }
        else {
            letters.forEach(lttrs.bind(null, b));
        }
    };

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
    info("Building duplicate free dictionary");
    const findings = new Map();
    let l, prev, curr, longerWord;
    const prevSearch = (word) => {
        longerWord = curr.find((a) => a.includes(word));
        l = counts[word];
        if(!longerWord || l != counts[longerWord]) {
            findings.set(word, l);
        }
    };
    for(let w = minLength + 1; w < foundWordsByLength.length && Array.isArray(foundWordsByLength[w]) && foundWordsByLength[w].length > 0; ++w) {
        prev = foundWordsByLength[w - 1];
        curr = foundWordsByLength[w];

        prev.forEach(prevSearch);
    }

    info("Sorting results");
    const sortedResults = Array.from(findings.keys()).sort((a, b) => findings.get(b) - findings.get(a)).slice(0, 20);

    info("Generating nice output table");
    const table = new Table({
        head: [ "Word", "Count", "Percentage" ]
    });

    table.push.apply(table, sortedResults.map((n) => [
        n,
        findings.get(n),
        ((findings.get(n) / bots.length) * 100).toFixed(2) + "%"
    ]));

    console.log(table.toString());
    console.log("And it only took", colors.blue(((Date.now() - start) / 1000).toFixed(2)), "seconds to get here");
});
