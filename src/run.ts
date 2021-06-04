#!/usr/bin/env node
import {JavaWebStart} from "./javaWebStart";

const trust = process.argv.includes("--trust");
const args = process.argv.filter((v) => !v.startsWith("--"));
/**
 * A new java web start instance
 */
JavaWebStart.fromArgv(...args)
	.then(async(javaWebStart) => {

		/**
		 * Register a handler that
		 */
		process.on("uncaughtException", (error) => {
			console.error(error, error.stack);
			process.exit(1);
		});

		process.on("unhandledRejection", (error) => {
			process.exit(1);
		});

		/**
		 * Make sure the process interrupted properly upon sigint!
		 */
		process.on("SIGINT", () => {
			process.exit(1);
		});

		console.info(javaWebStart.meta);
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 500);
		});
		return javaWebStart.run({trust:trust}).catch((error) => {
			console.error(error.message);
			process.exit(2);
		});
	});
