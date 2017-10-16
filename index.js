"use strict";

const twitchbots = require("twitchbots-node"),
    Table = require("cli-table"),
    chalk = require("chalk"),
    util = require("util"),
    fs = require("fs"),
    getOccurences = require("./count-occurences"),
    cacheFile = "bots.json",
    info = (str) => console.log(chalk.grey(`${str}...`)),
    /* eslint-disable security/detect-non-literal-fs-filename */
    fsExists = util.promisify(fs.access),
    fsReadFile = util.promisify(fs.readFile),
    fsWriteFile = util.promisify(fs.writeFile),
    /* eslint-enable security/detect-non-literal-fs-filename */
    ENCODING = 'utf8',
    BOT_COUNT = 3,
    RESULT_COUNT = 20,
    START = 0,
    TO_PERCENT = 100,
    MS_TO_S = 1000,
    PRECISION = 2,
    /**
     * @returns {[string]} All bot usernames on twitchbots.info.
     */
    getBots = async () => {
        let noError = true;
        try {
            await fsExists(cacheFile, fs.constants.F_OK);
        }
        catch(error) {
            noError = false;
        }
        if(noError) {
            info("Loading from cached file");
            const contents = await fsReadFile(cacheFile, ENCODING);
            return JSON.parse(contents);
        }

        info("Fetching from the twitchbots.info API");
        const bots = await twitchbots.getAllBots(),
            names = bots.map((b) => b.username);
        info("Caching it to disk");
        await fsWriteFile(cacheFile, JSON.stringify(names), ENCODING);
        return names;
    };

info("Loading all bots from twitchbots.info");

getBots().then((bots) => {
    info("Analyzing word frequency");
    let time = Date.now();
    const findings = getOccurences(bots, BOT_COUNT);
    time = Date.now() - time;

    info("Sorting results");
    const sortedResults = Object.keys(findings).sort((a, b) => findings[b] - findings[a])
        .slice(START, RESULT_COUNT);

    info("Generating nice output table");
    const table = new Table({
        head: [
            "Word",
            "Count",
            "Percentage"
        ]
    });

    table.push(...sortedResults.map((n) => [
        n,
        findings[n],
        `${((findings[n] / bots.length) * TO_PERCENT).toFixed(PRECISION)}%`
    ]));

    console.log(table.toString());
    console.log("And it only took", chalk.blue((time / MS_TO_S).toFixed(PRECISION)), "seconds to get here");
})
    .catch((e) => console.warn(e));
