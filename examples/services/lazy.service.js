"use strict";

module.exports = {
	name: "lazy",

	started() {
		return this.Promise.delay(1000);
	},

	stopped() {
		return this.Promise.delay(1000);
	}
};
