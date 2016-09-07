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

## Thanks
Thanks to liori from the tatoeba room for reminding me, that I should fix my
traversal order. Without them this would be way slower (like 1000x slower or
something).
