# twitchbots-stats
Counts the occurence of substrings in a list of strings, in this project the
usernames of all bots registered on [twitchbots.info](https://twitchbots.info).

It can count the occurence of substrings of a minimum length of 1 and up with
the efficiency staying about the same, though bigger minimum lengths will speed
it up enormously, since the set of strings to operate on gets way smaller.

The occurences are counted by traversing a tree of existing substrings and
counting how many strings from the parent node still contain the longer
substring. It also prunes shorter substrings with only one child if that has the
same occurence (i.e. no string has the shorter substring at the end of it).

The list of usernames is cached to the disk in a file called `bots.json`.

## Usage
All parameters have to be tweaked within `index.js`, including the output
format. By default it prints a table with the twenty most common substrings.

```shell
npm i
node index.js
```

There is a (in theory) re-usable module for the occurence calculation in `count-occurences.js`.

## Efficiency
I'm not exactly sure what the complexity of it is, but it's probably somewhere
in the `O(n * logn)` region.

The tree is traversed by generation, so all nodes on the same level are visited
in one loop, then the next ones etc. This means the algorithm builds memory for
each substring of strings that still included it and of letters that may follow
it. I believe it is optimized so the only performance benefits to be gained may
fit in the following categories:

 - Different traversal method
 - Less read/write intensive data structures
 - Optimization of V8 edge cases

This is a table of runtimes I have experienced (all with node 6) on 4234 strings:

Minimum Length | Intel Pentium N3520 Time [s] | Intel Core i5 4460 Time [s]
---------------|------------------------------|----------------------------
3              | 1.8                          | 0.5
5              | 1.8                          | 0.5
11             | 1.0                          | 0.2
14             | 0.4                          | 0.1

These numbers - despite both CPUs being able to adjust their clock speed - are
pretty stable. As can be seen, the big speed improvements happen with bigger
numbers where the amount of strings is reduced considerably - at minimum length
11 there are about a quarter of the strings left.

## Thanks
Thanks to liori from the tatoeba room for reminding me, that I should fix my
traversal order. Without them this would be way slower (like 1000x slower or
something).
