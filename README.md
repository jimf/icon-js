# icon-js

Interpreter for the [Icon][] programming langauge.

*Work in progress*

## Todo

- [x] Lexer
- [ ] Parser
- [ ] Interpreter
- [ ] Command-line interface
- [ ] REPL (maybe? low priority)

## Usage

Install necessary dependencies (requires at least Node.js 8+):

    npm install

Run the interpreter with an Icon source file:

    ./bin/icon.js example-file.icn

Run the interpreter with the `--help` flag to view a list of options:

    ./bin/icon.js --help

## Motivation

I was thinking about what language I might use for this year's
[Advent of Code][] challenges and what sort of language traits are
favorable for them. The first trait that came to mind was string
parsing and processing, since nearly every puzzle involves some level
of data extraction. Searching for string-parsing languages quickly
brought me to [Haskell][] and [SNOBOL][]. I already had familiarity
with Haskell, but not SNOBOL, so I started reading up on it. It has
some interesting features, but the syntax, particularly with labels
and GOTOs didn't feel too enticing. SNOBOL led me to Icon however,
which is a SNOBOL descendent. I thought Icon looked really cool,
particularly with the goal-oriented behaviors around the notion of
success or failure, as well as the powerful features built around
generators. I got the itch to implement an interpreter, and thus,
this project was born.

## License

MIT

[Icon]: https://en.wikipedia.org/wiki/Icon_%28programming_language%29
[Advent of Code]: https://adventofcode.com/
[Haskell]: https://en.wikipedia.org/wiki/Haskell_%28programming_language%29
[SNOBOL]: https://en.wikipedia.org/wiki/SNOBOL
