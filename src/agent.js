"use strict";

const glob 		= require("glob");
const path 		= require("path");
const _ 		= require("lodash");
const Exec 		= require("child_process").exec;
const Spawn		= require("child_process").spawn;

const { MoleculerClientError } 	= require("moleculer").Errors;

module.exports = {
	// Service name
	name: "$agent",

	// Default settings
	settings: {
		serviceFolder: "./examples"
	},

	actions: {
		/**
		 * Start a local service
		 */
		start: {
			params: {
				service: "string"
			},
			handler(ctx) {
				return this.startService(ctx.params.service);
			}
		},

		/**
		 * Stop a local service
		 */
		stop: {
			params: {
				service: "string"
			},
			handler(ctx) {
				return this.stopService(ctx.params.service);
			}
		},

		/**
		 * Get list of available services
		 *
		 * @param {any} ctx
		 * @returns
		 */
		services(ctx) {
			return _.values(this.services).map(schema => _.pick(schema, ["name", "version", "settings", "metadata"]));
		},

		/**
		 * Start all local services
		 *
		 * @param {any} ctx
		 */
		startAll(ctx) {
			return this.startAllServices();
		},

		/**
		 * Stop all local services
		 *
		 * @param {any} ctx
		 */
		stopAll(ctx) {
			return this.stopAllServices();
		},

		/**
		 * Start a new Moleculer NodeJS process with the same arguments
		 *
		 * @param {any} ctx
		 */
		fork(ctx) {
			const args = [...process.execArgv, ...process.argv.slice(1)];
			const proc = this.spawn(process.execPath, args, { detached: true, stdio: "ignore" });
			proc.unref();
			this.logger.info(`New process started. PID: ${proc.pid}`);
			return { pid: proc.pid };
		},

		exec: {
			params: {
				cmd: "string",
				opts: { type: "object", optional: true }
			},
			handler(ctx) {
				return this.execute(ctx.params.cmd, ctx.params.opts || {});
			}
		},

		/**
		 * Exit the current process
		 *
		 * @param {any} ctx
		 */
		quit: {
			params: {
				code: { type: "number", optional: true }
			},
			handler(ctx) {
				this.logger.warn("Exit process...");
				this.broker.stop()
					.then(() => process.exit(ctx.params.code || 0));
			}
		}
	},

	methods: {
		/**
		 * Read all services from service folder
		 *
		 */
		readServiceFolder() {
			const folder = path.resolve(this.settings.serviceFolder);
			this.logger.info(`Read all services from '${folder}' folder...`);
			const serviceFiles = glob.sync(path.join(folder, "**", "*.service.js"));
			this.services = {};
			serviceFiles.forEach(file => {
				const schema = require(file);
				if (schema.name)
					this.services[file] = schema;
			});

			this.logger.info(`Found ${Object.keys(this.services).length} service(s).`);
		},

		/**
		 * Start a local service by name
		 *
		 * @param {String} serviceName
		 */
		startService(serviceName) {
			const service = this.broker.getLocalService(serviceName);
			if (service)
				return;// throw new MoleculerClientError(`The '${serviceName}' service is already running`, 400, null, { service: serviceName });

			const schema = _.values(this.services).find(schema => schema.name == serviceName);
			if (!schema)
				throw new MoleculerClientError(`The '${serviceName}' service is not found`, 400, null, { service: serviceName });

			this.broker.createService(schema);
		},

		/**
		 * Stop a local running service by name
		 *
		 * @param {String} serviceName
		 */
		stopService(serviceName) {
			const service = this.broker.getLocalService(serviceName);
			if (!service)
				throw new MoleculerClientError(`The '${serviceName}' service is not running`, 400, null, { service: serviceName });

			this.broker.destroyService(service);
		},

		/**
		 * Start all local services
		 *
		 */
		startAllServices() {
			_.forIn(this.services, schema => {
				try {
					this.startService(schema.name);
				} catch(ex) {
					this.logger.warn(ex);
				}
			});
		},

		/**
		 * Stop all local services
		 *
		 */
		stopAllServices() {
			this.broker.services
				.filter(service => !/^\$/.test(service.name))
				.forEach(service => this.stopService(service.name));
		},

		/**
		 * Execute a command
		 *
		 * @param {String} cmd
		 * @param {Object} opts
		 */
		execute(cmd, opts) {
			this.logger.info(`Execute: ${cmd}`);
			return new Promise((resolve, reject) => {
				Exec(cmd, opts, (error, stdout, stderr) => {
					if (error) {
						this.logger.error("Error output:", error);
						return reject(error);
					}

					this.logger.debug("Output:", stdout);
					if (stderr)
						this.logger.error("STDERR:", stderr);

					resolve({ cmd, opts, stdout, stderr });
				});
			});
		},

		spawn(command, args, opts) {
			this.logger.info("Spawn a new process.", command, args);
			return Spawn(command, args, opts);
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		this.services = [];

		this.readServiceFolder();
	}
}
