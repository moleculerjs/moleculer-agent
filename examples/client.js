/* eslint-disable no-console */
"use strict";

const _ 				= require("lodash");
const chalk 			= require("chalk");

const { ServiceBroker } = require("moleculer");
//const { Agent } 		= require("../");

// Create broker
const broker = new ServiceBroker({
	nodeID: process.argv[2] || "client-" + process.pid,
	transporter: "NATS",
	logger: console
});

let reqCount = 0;

broker.start()
	.then(() => broker.waitForServices("math"))
	.then(() => {
		setInterval(() => {
			let payload = { a: _.random(0, 100), b: _.random(0, 100), count: ++reqCount };
			const p = broker.call("math.add", payload);
			p.then(({ count, res }) => {
				broker.logger.info(_.padEnd(`${count}. ${payload.a} + ${payload.b} = ${res}`, 20), `(from: ${p.ctx.nodeID})`);
			}).catch(err => {
				broker.logger.warn(chalk.red.bold(_.padEnd(`${reqCount}. ${payload.a} + ${payload.b} = ERROR! ${err.message}`)));
			});
		}, 1000);

	});
