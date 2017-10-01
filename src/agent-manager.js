"use strict";

const _ 		= require("lodash");

module.exports = {
	// Service name
	name: "asm",

	// Default settings
	settings: {

	},

	actions: {
		scale: {
			params: {
				service: { type: "string" },
				instances: { type: "number" }
			},
			handler(ctx) {
				// TODO
			}
		}
	},

	methods: {

	},

	events: {
		"$services.changed"() {

		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
	}
}
