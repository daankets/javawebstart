[![Node.js CI](https://github.com/daankets/javawebstart/actions/workflows/node.js.yml/badge.svg)](https://github.com/daankets/javawebstart/actions/workflows/node.js.yml)
# About
This is a NodeJS utility & library for running Java Web Start pacages with a java version that does not (no longer) include the `javaws` feature.
The utility is written in TypeScript, and comes packaged an installable as an NPM package.

## Why this tool?
At some point I found myself without a suitable Java runtime that could still
run a Java Web Start package, which I needed in order to validate some
files to be uploaded to the tax administration. Checking the JNLP file
and running the tool manually was easy enough, but I still felt...
a new tool could come in handy... so here we are...

# Features
- **Downloading** a JNLP specified from an http or https url
- **Using** a locally stored JNLP file
- **Parsing** the downloaded/read JNLP file  
- **Downloading** the JNLP jar file, with a progress bar
- **Using** a cached JNLP jar file (provided that there is no newer version)  
- **Running** the JNLP from the downloaded or cached Jar file
- **Interrupting** The running Java process when the Node process is interrupted
- **Redirecting** java stdout, stderr to the Node process
- **Redirecting** Node stdin, to the Java process

# Dependencies
* A suitable version of **Java** must be installed on your system.
* This library uses the libxmljs2 and cli-progress libraries.

# Installing
```bash
npm -g install javawebstart
```

# Usage
```bash
# If locally installed via npm install  -g
javawebstart <jnlp-url>

# Via NPX
npx -g javawebstart <jnlp-url>
```

## API
It is possible to use this module as an API as well.
```typescript
// Import the main class of the library
import {JavaWebStart} from "javawebstart";

// Download a remote or local JNLP file
let starter = await JavaWebStart.downloadJNLP(jnlpUrl);

// OR use existing XML
starter = new JavaWebStart(myJNLPXml);

// Optionally, await the download first or only
// await starter.download();

// Or just run (potentially with options)
await starter.run();
```

## Run options
The run method can taken an options object, with the following optional properties:
- A jar location
- An alternative 'WritableStream' for
  - stdout
  - stderr
- An alternative `ReadableStream' for the reading input

## Credits
### cli-progress
Copyright (c) 2015-2020 Andi Dittrich (MIT LICENSE)

[LICENSE](https://raw.githubusercontent.com/npkgz/cli-progress/master/LICENSE.md)

### libxmljs2
Copyright 2009, Squish Tech, LLC. All rights reserved.

[LICENSE](https://raw.githubusercontent.com/marudor/libxmljs2/main/LICENSE)

## Disclaimer
Java Web Start
It is up to you to validate if the JNLP and jar file you wish to run come
from a **trusted source**. At this point I did NOT yet implement any signatures or perform
any additional checks. I can not be held liable for ANY damage that might occur from using
this utility. There is no warranty whatsoever.
