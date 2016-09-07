"use strict";

const twitchbots = require("twitchbots-node");
const Table = require("cli-table");
const colors = require("colors/safe");
const fs = require("mz/fs");
const co = require("co");
const getOccurences = require("./count-occurences");

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
        const names = bots.map((b) => b.username);
        info("Caching it to disk");
        yield fs.writeFile(cacheFile, JSON.stringify(names));
        return names;
    }
});

info("Loading all bots from twitchbots.info");

getBots().then((bots) => {
    info("Analyzing word frequency");
    let time = Date.now();
    const findings = getOccurences(bots, 3);
    time = Date.now() - time;

    info("Sorting results");
    const sortedResults = Object.keys(findings).sort((a, b) => findings[b] - findings[a]).slice(0, 20);

    info("Generating nice output table");
    const table = new Table({
        head: [ "Word", "Count", "Percentage" ]
    });

    table.push.apply(table, sortedResults.map((n) => [
        n,
        findings[n],
        ((findings[n] / bots.length) * 100).toFixed(2) + "%"
    ]));

    console.log(table.toString());
    console.log("And it only took", colors.blue((time / 1000).toFixed(2)), "seconds to get here");
}).catch((e) => console.warn(e));
