[![Moleculer logo](http://moleculer.services/images/banner.png)](https://github.com/ice-services/moleculer)

<!--
[![Build Status](https://travis-ci.org/ice-services/moleculer-agent.svg?branch=master)](https://travis-ci.org/ice-services/moleculer-agent)
[![Coverage Status](https://coveralls.io/repos/github/ice-services/moleculer-agent/badge.svg?branch=master)](https://coveralls.io/github/ice-services/moleculer-agent?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/b108c12cbf554fca9c66dd1925d11cd0)](https://www.codacy.com/app/mereg-norbert/moleculer?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ice-services/moleculer-agent&amp;utm_campaign=Badge_Grade)
[![Code Climate](https://codeclimate.com/github/ice-services/moleculer-agent/badges/gpa.svg)](https://codeclimate.com/github/ice-services/moleculer-agent)
[![David](https://img.shields.io/david/ice-services/moleculer-agent.svg)](https://david-dm.org/ice-services/moleculer-agent)
[![Known Vulnerabilities](https://snyk.io/test/github/ice-services/moleculer-agent/badge.svg)](https://snyk.io/test/github/ice-services/moleculer-agent)
[![Join the chat at https://gitter.im/ice-services/moleculer-agent](https://badges.gitter.im/ice-services/moleculer-agent.svg)](https://gitter.im/ice-services/moleculer-agent?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Downloads](https://img.shields.io/npm/dt/moleculer-agent.svg)](https://www.npmjs.com/package/moleculer-agent)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fice-services%2Fmoleculer-agent.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fice-services%2Fmoleculer-agent?ref=badge_shield)
-->
# [PoC] Moleculer Agent [![NPM version](https://img.shields.io/npm/v/moleculer-agent.svg)](https://www.npmjs.com/package/moleculer-agent)
**Proof-of-Concept** project. Don't use it in production!

## Concept

1. Your Moleculer microservices project is a monorepo. Every services are in one repository.
2. You are running multiple instances on multiple servers.
3. Any services can run on any servers.
4. Create a Docker image from project source which starts Moleculer broker without services, except Agent service.
5. Agent Service Manager (ASM) watches the connected bare nodes and distributes the services by a configuration.
6. You can dynamically scaling up or down services with Manager or turn on the Autopilot mode.

**Example video how you can start/stop services on remote nodes with agent from Moleculer CLI:**
[![Video](https://img.youtube.com/vi/2rU0oNOQy-k/maxresdefault.jpg)](https://www.youtube.com/watch?v=2rU0oNOQy-k)

## Usage

**Bare node starter script**

```js
"use strict";

const { ServiceBroker } = require("moleculer");
const { Agent } 		= require("../");

// Create broker
const broker = new ServiceBroker({
	nodeID: process.argv[2] || "node-" + process.pid,
	transporter: "NATS",
	logger: console
});

broker.createService(Agent);

broker.start();
```

## Actions

### Start a service

```js
broker.call("$agent.start", { service: "math", nodeID: "node-10" });
```

### Stop a service

```js
broker.call("$agent.stop", { service: "math", nodeID: "node-10" });
```

### Get list of available services

```js
broker.call("$agent.services", { nodeID: "node-10" })
    .then(services => console.log(services));
```

### Start all services

```js
broker.call("$agent.startAll", { nodeID: "node-10" });
```

### Stop all services

```js
broker.call("$agent.stopAll", { nodeID: "node-10" });
```

### Fork a node
The node forks itself to a new process with the same arguments & env.

```js
broker.call("$agent.fork");
```

### Exit Moleculer process

```js
broker.call("$agent.quit");
```


# License
Moleculer is available under the [MIT license](https://tldrlegal.com/license/mit-license).

[3rd party licenses](https://app.fossa.io/reports/833f0d1b-462b-4eff-a4e4-e030115439fe)

# Contact
Copyright (c) 2016-2017 Ice Services

[![@ice-services](https://img.shields.io/badge/github-ice--services-green.svg)](https://github.com/ice-services) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
