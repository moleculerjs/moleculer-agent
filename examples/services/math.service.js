"use strict";

const _ = require("lodash");

module.exports = {
	name: "math",

	actions: {
		add(ctx) {
			this.logger.info(_.padEnd(`${ctx.params.count}. Add ${ctx.params.a} + ${ctx.params.b}`, 20), `(from: ${ctx.callerNodeID})`);
			return {
				count: ctx.params.count,
				res: Number(ctx.params.a) + Number(ctx.params.b)
			};
		},
	}
};
