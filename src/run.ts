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
			process.exit(1);
		});

		/**
		 * Make sure the process interrupted properly upon sigint!
		 */
		process.on("SIGINT", () => {
			process.exit(1);
		});

		process.on("beforeExit",()=>{
			javaWebStart.stop("SIGINT");
		})

		console.info(javaWebStart.meta);
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 500);
		})
		return javaWebStart.run();
	})
