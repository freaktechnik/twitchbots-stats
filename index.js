"use strict";

const twitchbots = require("twitchbots-node"),
    Table = require("cli-table"),
    chalk = require("chalk"),
    Listr = require("listr"),
    util = require("util"),
    fs = require("fs"),
    getOccurences = require("./count-occurences"),
    cacheFile = "bots.json",
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
    tasks = new Listr([
        {
            title: "Check cache",
            task: async (ctx) => {
                ctx.isCached = true;
                try {
                    await fsExists(cacheFile, fs.constants.F_OK);
                }
                catch(error) {
                    ctx.isCached = false;
                }
            }
        },
        {
            title: "Loading all bots from cached file",
            enabled: (ctx) => ctx.isCached,
            task: async (ctx) => {
                const contents = await fsReadFile(cacheFile, ENCODING);
                ctx.bots = JSON.parse(contents);
            }
        },
        {
            title: "Fetching from the twitchbots.info API",
            enabled: (ctx) => !ctx.isCached,
            task: async (ctx) => {
                const bots = await twitchbots.getAllBots();
                ctx.bots = bots.map((b) => b.username);
            }
        },
        {
            title: "Caching bots to disk",
            enabled: (ctx) => !ctx.isCached,
            task: (ctx) => fsWriteFile(cacheFile, JSON.stringify(ctx.bots), ENCODING)
        },
        {
            title: "Analyzing word frequency",
            task: (ctx) => {
                ctx.time = Date.now();
                ctx.findings = getOccurences(ctx.bots, BOT_COUNT);
                ctx.time = Date.now() - ctx.time;
            }
        },
        {
            title: "Sorting results",
            task: (ctx) => {
                ctx.sortedResults = Object.keys(ctx.findings).sort((a, b) => ctx.findings[b] - ctx.findings[a])
                    .slice(START, RESULT_COUNT);
            }
        },
        {
            title: "Generating nice output table",
            task: (ctx, task) => {
                const table = new Table({
                    head: [
                        "Word",
                        "Count",
                        "Percentage"
                    ]
                });

                table.push(...ctx.sortedResults.map((n) => [
                    n,
                    ctx.findings[n],
                    `${((ctx.findings[n] / ctx.bots.length) * TO_PERCENT).toFixed(PRECISION)}%`
                ]));
                ctx.table = table.toString();
            }
        }
    ]);

tasks.run().then((ctx) => {
    console.log(ctx.table);
    console.log(chalk`And it only took {blue ${(ctx.time / MS_TO_S).toFixed(PRECISION)}} seconds to get here`);
}).catch(console.error);
