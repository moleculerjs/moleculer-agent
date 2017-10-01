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
		serviceFolder: "./services",
		serviceFileMask: "*.service.js",
		watch: false
	},

	actions: {
		/**
		 * Start a local service
		 */
		start: {
			params: {
				service: { type: "string" },
				version: { type: "any", optional: true }
			},
			handler(ctx) {
				return this.startService(ctx.params.service, ctx.params.version);
			}
		},

		/**
		 * Stop a local service
		 */
		stop: {
			params: {
				service: { type: "string" },
				version: { type: "any", optional: true }
			},
			handler(ctx) {
				return this.stopService(ctx.params.service, ctx.params.version);
			}
		},

		/**
		 * Get list of available services
		 *
		 * @param {any} ctx
		 * @returns
		 */
		services(ctx) {
			return this.services.map(item => _.pick(item.schema, ["name", "version", "settings", "metadata"]));
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

		reloadAll() {
			return this.reloadRunningServices();
		},

		/**
		 * Refresh available service list
		 *
		 * @param {any} ctx
		 * @returns
		 */
		refresh(ctx) {
			return this.readServiceFolder();
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

		/**
		 * Execute a command
		 */
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
		 * Checkout the current git repository by branch, tag, or commit
		 */
		checkout: {
			params: {
				commit: { type: "string", optional: true },
				tag: { type: "string", optional: true },
				branch: { type: "string", optional: true }
			},
			handler(ctx) {
				const cmds = ["git fetch --all --tags --prune"];
				//const cmds = [];
				if (ctx.params.commit)
					cmds.push(`git checkout ${ctx.params.commit}`);
				else if (ctx.params.tag)
					cmds.push(`git checkout tags/${ctx.params.tag}`);
				else if (ctx.params.branch)
					cmds.push(`git checkout ${ctx.params.branch}`);
				else
					cmds.push(`git checkout master`);

				return this.Promise.map(cmds, cmd => this.execute(cmd))
					.then(res => {
						this.readServiceFolder;
						return res;
					});
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
				this.quit(ctx.params.code);
			}
		},

		/**
		 * Restart the current process
		 *
		 * @param {any} ctx
		 * @returns
		 */
		restart(ctx) {
			return this.restart();
		}
	},

	methods: {
		/**
		 * Read all services from service folder
		 */
		readServiceFolder() {
			const folder = path.resolve(this.settings.serviceFolder);
			this.logger.info(`Read all services from '${folder}' folder...`);
			const serviceFiles = glob.sync(path.join(folder, "**", this.settings.serviceFileMask));
			this.services = [];
			serviceFiles.forEach(filename => {
				const schema = require(filename);
				if (schema.name)
					this.services.push({
						filename,
						name: schema.name,
						version: schema.version,
						schema
					});
			});

			this.logger.info(`Found ${this.services.length} service(s).`);
		},

		/**
		 * Start a local service by name
		 *
		 * @param {String} serviceName
		 * @param {any} version
		 */
		startService(serviceName, version) {
			const service = this.broker.getLocalService(serviceName);
			if (service)
				return this.logger.info(`The '${serviceName}' service is already running.`);

			const item = this.services.find(item => item.name == serviceName && (version == null || item.version == version ));
			if (!item)
				throw new MoleculerClientError(`The '${serviceName}' service is not found`, 400, null, { service: serviceName, version });

			this.broker.loadService(item.filename);
		},

		/**
		 * Stop a local running service by name
		 *
		 * @param {String} serviceName
		 * @param {any} version
		 */
		stopService(serviceName, version) {
			// TODO this.broker.getLocalService doesn't support version yet
			//const service = this.broker.getLocalService(serviceName, version);
			const service = this.broker.services.find(schema => schema.name == serviceName && (version == null || schema.version == version ));
			if (!service)
				throw new MoleculerClientError(`The '${serviceName}' service is not running`, 400, null, { service: serviceName, version });

			this.broker.destroyService(service);
		},

		/**
		 * Start all local services
		 *
		 */
		startAllServices() {
			_.forIn(this.services, item => {
				try {
					this.startService(item.name, item.version);
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
				.forEach(service => {
					try {
						this.stopService(service.name, service.version);
					} catch(ex) {
						this.logger.warn(ex);
					}
				});
		},

		/**
		 * Reload running services
		 *
		 */
		reloadRunningServices() {
			this.broker.services
				.filter(service => !/^\$/.test(service.name))
				.forEach(service => {
					try {
						this.broker.hotReloadService(service);
					} catch(ex) {
						this.logger.warn(ex);
					}
				});
		},

		/**
		 * Quit the current process
		 *
		 * @returns
		 */
		quit(code) {
			this.logger.warn("Exit process...");
			return this.broker.stop()
				.then(() => process.exit(code || 0));
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

		/**
		 * Spawn a child process
		 *
		 * @param {String} command
		 * @param {Array<String>} args
		 * @param {Object} opts
		 * @returns {ChildProcess}
		 */
		spawn(command, args, opts) {
			this.logger.info("Spawn a new process.", command, args);
			return Spawn(command, args, opts);
		},

		/**
		 * Restart the current process
		 *
		 */
		restart() {
			const args = [...process.execArgv, path.join(__dirname, "restarter.js"), ...process.argv.slice(1)];
			const proc = this.spawn(process.execPath, args, { detached: true, stdio: "ignore" });
			proc.unref();
			this.logger.info(`Restarter started. PID: ${proc.pid}`);

			this.quit(0);
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
