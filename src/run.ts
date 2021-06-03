#!/usr/bin/env node
import {JavaWebStart} from "./java-web-start";

/**
 * A new java web start instance
 */
JavaWebStart.fromArgv(...process.argv)
	.then(async(javaWebStart) => {

		/**
		 * Register a handler that
		 */
		process.on("uncaughtException", (error) => {
			console.error(error, error.stack);
			javaWebStart.stop();
		});
		/**
		 * Make sure the process interrupted properly upon sigint!
		 */
		process.on("SIGINT", () => {
			javaWebStart.stop();
		});

		console.info(javaWebStart.meta);
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 500);
		})
		return javaWebStart.run();
	})
