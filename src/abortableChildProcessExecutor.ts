import {ChildProcess, exec, spawn} from "child_process";

/**
 * An execution allows you to monitor the result of an Executor's execute method.
 * You can await the result or call abort();
 */
export class Execution extends Promise<number> {
	constructor(executor: (resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: any) => void) => void, private readonly childProcess: ChildProcess) {
		super(executor);
	}

	/**
	 * Aborts the execution
	 * @param signal The signal to use, defaults to SIGINT
	 */
	public abort(signal: NodeJS.Signals = "SIGINT"): boolean {
		return this.childProcess.kill(signal || "SIGTERM");
	}

}

/**
 * The executor class is a wrapper around a command with optional arguments. It can spawn multiple child processes, for
 * which an Execution object is returned. The Execution allows you to await the result, or abort the process (similar to
 * an {$code AbortController}).
 */
export class AbortableChildProcessExecutor {
	private readonly $args;

	/**
	 * Constructs a new Executor, using the given command and optional arguments
	 * @param command the command
	 * @param args The optional arguments
	 */
	constructor(private readonly command: string, ...args: string[]) {
		this.$args = args;
	}

	/**
	 * Execute the child process synchronously and wait for output.
	 * @param callback
	 */
	execute(callback: (error: any, stdout: string, stderr: string) => void) {
		exec([this.command].concat(this.$args).join(" "), callback);
	}

	/**
	 * Executes this command, returning an executor.
	 * @param stdout The optional alternative {@code NodeJS.WritableStream} for redirecting the child's stdout to
	 * @param stderr The optional alternative {@code NodeJS.WritableStream} for redirecting the child's stderr to
	 * @param stdin The optional alternative {@code NodeJS.ReadableStream} for redirecting to the child's stdin
	 */
	spawn({stdout, stderr, stdin}: { stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream, stdin?: NodeJS.ReadableStream }): Execution {
		const stdoutStream = stdout || process.stdout;
		const stderrStream = stderr || process.stderr;
		const stdinStream = stdin || process.stdin;
		try {
			const child = spawn(this.command, this.$args);
			child.stdout.pipe(stdoutStream);
			child.stderr.pipe(stderrStream);
			stdinStream.pipe(child.stdin);
			return new Execution((resolve, reject) => {
				child.on("error", (error) => {
					reject(error);
				})
				child.on("close", (code) => {
					console.info("Process terminated");
					stdinStream.unpipe(child.stdin);
					child.stdout.unpipe(stderrStream);
					//  stdoutStream.write(child.stdout.read());
					stdout && stdout.end();
					child.stderr.unpipe(stderrStream);
					// stderrStream.write(child.stderr.read());
					stderr && stderr.end();
					resolve(code || 0);
				})
			}, child);
		} catch (error) {
			console.error(error);
			throw error;
		}
	}
}
