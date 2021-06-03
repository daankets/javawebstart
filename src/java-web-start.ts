import {URL} from "url";
import {spawn} from "child_process";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import {Document, Element, parseXml, Text} from "libxmljs2";
import * as Path from "path";
import {PathLike, WriteStream} from "fs";
import * as cliProgress from "cli-progress";
import {SingleBar} from "cli-progress";
import {EventEmitter} from "events";

/**
 * The main class of the package, a wrapper around a JNLP XML Structure.
 * An instance of this class can be created by construction via an xml object,
 * via parsing a string or via downloading from an http(s):// or file:// url.
 */
export class JavaWebStart {
	private $eventEmitter = new EventEmitter();

	/**
	 * Creates a new JavaWebStart instance, from the XML data of a JNLP file.
	 * @param jnlpXML The XML Document for the JNLP file
	 */
	constructor(private readonly jnlpXML: Document) {
	}

	/**
	 * Downloads a JNLP file from a url. This can be a file url.
	 * @param jnlpLocation http(s):// or file:// location of the JNLP file.
	 */
	static async downloadJNLP(jnlpLocation: URL): Promise<JavaWebStart> {
		let data: string | null;
		if (jnlpLocation.protocol.startsWith("http")) {
			data = await new Promise((resolve, reject) => {
				const client = jnlpLocation.protocol.startsWith("https") ? https : http;
				const request = client.get(jnlpLocation, (res) => {
					let dataSegments: string[] | null = [];
					res.on("data", (data) => {
						dataSegments && dataSegments.push(data);
					});
					res.on("end", () => {
						resolve(dataSegments && dataSegments.join(""));
					});
					request.on("error", (error) => {
						dataSegments = null;
						reject(error);
					});
					request.end();
				});
			})
		} else {
			data = await fs.promises.readFile(jnlpLocation, {encoding: "utf-8"});
		}
		return JavaWebStart.parse(data as string);
	}

	/**
	 * Parses a JavaWebStart instances by reading raw JNLP data from a string.
	 * @param data The raw JNLP XML data.
	 */
	static parse(data: string): JavaWebStart {
		return new JavaWebStart(parseXml(data));
	}

	/**
	 * Returns the title from the JNLP meta information
	 */
	get title(): string {
		return (this.jnlpXML.get("//information/title") as Text)?.text();
	}

	/**
	 * Returns the vendor from the JNLP meta information
	 */
	get vendor(): string | null {
		return (this.jnlpXML.get("//information/vendor") as Text)?.text();
	}

	/**
	 * Returns the homepage from the JNLP meta information
	 */
	get homepage(): string | null {
		return (this.jnlpXML.get("//information/homepage") as Element)?.attr("href")?.value() || null;
	}

	/**
	 * Returns the JAR location from the JNLP file
	 */
	get jarLocation(): string {
		const codebase = this.jnlpXML.root()?.attr("codebase")?.value();
		return `${codebase}/${this.jarName}`;
	}

	/**
	 * Returns the name of the JAR file from the JNLP file
	 */
	get jarName(): string | null {
		return (this.jnlpXML.get("//resources/jar") as Element)?.attr("href")?.value() || null;
	}

	/**
	 * Returns the name of the main class from the JNLP file
	 */
	get mainClass(): string | null {
		return (this.jnlpXML.get("//application-desc") as Element)?.attr("main-class")?.value() || null;
	}

	/**
	 * Returns all meta info from the JNLP file
	 */
	get meta(): object {
		return {
			title: this.title,
			vendor: this.vendor,
			homepage: this.homepage,
			jarLocation: this.jarLocation,
			mainClass: this.mainClass
		};
	}

	/**
	 * Parse the JavaWebStart info from the process.argv
	 * @param args Process argv
	 */
	static async fromArgv(...args: string[]): Promise<JavaWebStart> {
		if (args.length < 3) {
			console.warn("Usage: javawebstart <jnlpUrl>")
			throw new Error("Missing URL");
		}
		return JavaWebStart.downloadJNLP(new URL(args[2]));
	}

	/**
	 * Downloads the JAR file, and returns a promise for it's path.
	 */
	async download(): Promise<PathLike> {
		const jarLocation = new URL(this.jarLocation);

		return new Promise((resolve, reject) => {
			if (!this.jarName) {
				reject("No jar location!");
			}
			const targetLocation = Path.join(process.cwd(), this.jarName as string);
			let cachedLength = 0;
			if (fs.existsSync(targetLocation)) {
				const stat = fs.statSync(targetLocation);
				if (stat.isFile()) {
					cachedLength = stat.size;
				}
			}

			const abortController = global.AbortController ? new global.AbortController() : undefined;
			const client = this.jarLocation.startsWith("https") ? https : http;
			const request = client.get(jarLocation, {
				abort: abortController && abortController.signal
			}, (res) => {
				let counter = 0;
				let progress: SingleBar | null = null;
				let writeStream: WriteStream;
				if (res.headers["content-length"]) {
					const contentLength = parseInt(res.headers["content-length"]);
					if (cachedLength && cachedLength === contentLength && !global.it) {
						console.debug("Cached version found at %s. Running from cache...", targetLocation);
						abortController ? abortController.abort() : request.abort();
						resolve(targetLocation);
						return;
					}
					if (res.statusCode!==200) {
						console.warn(res.statusCode,res.statusMessage);
						reject("Download failed!");
					}
					writeStream = fs.createWriteStream(targetLocation, {encoding: "binary"});
					console.debug("Downloading %s ...", this.jarName);
					progress = new cliProgress.SingleBar({
						format: 'Downloading {bar} {percentage}% ({value}/{total} bytes)',
						barCompleteChar: '\u2588',
						barIncompleteChar: '\u2591',
						hideCursor: true
					});
					progress.start(contentLength, 0, {})
				}
				res.on("end", () => {
					progress && progress.stop();
					// console.debug(`= ${counter}b`);
					writeStream.close();
					resolve(targetLocation);
				})
				res.on("data", (data) => {
					// console.debug(`+ ${data.length}b`);
					counter += data.length;
					progress && progress.update(counter);
					writeStream.write(data);
				});
			});
			request.on("error", (error) => {
				reject(error);
			});
			request.end();
		});
	}

	/**
	 * Method for interrupting a running web start process. Will send SIGINT or SIGTERM to the child process.
	 * @param signal? Optional signal (SIGINT or SIGTERM)
	 */
	stop(signal: "SIGINT" | "SIGTERM" = "SIGINT"): void {
		this.$eventEmitter.emit("stop", signal);
	}

	/**
	 * Runs a JAR file - optionally downloading it first - and returns a promise for the exit code.
	 * @param jarLocation Location of the jar file to run (bypass download)
	 * @param stdout Alternative stdout WritableStream for capturing std output
	 * @param stderr Alternative stderr WritableStream for capturing err output
	 * @param stdin Alternative stdin ReadableStream for providing input
	 */
	async run({
		          jarLocation,
		          stdout,
		          stderr,
		          stdin
	          }: {
		jarLocation?: string,
		stdout?: NodeJS.WritableStream,
		stderr?: NodeJS.WritableStream,
		stdin?: NodeJS.ReadableStream
	} = {}): Promise<number> {
		const jarPath = jarLocation || await this.download();
		if (!fs.existsSync(jarPath)) {
			throw new Error("Jar file not found!");
		}
		if (!this.mainClass) {
			throw new Error("No main class specified");
		}
		console.info("Starting Java Web Start...");
		let childProcessRun: Promise<number>;
		const stdoutStream = stdout || process.stdout;
		const stderrStream = stderr || process.stderr;
		const stdinStream = stdin || process.stdin;
		try {
			childProcessRun = new Promise<number>((resolve, reject) => {
				const child = spawn("java", ["-cp", jarPath.toString(), this.mainClass as string], {});
				const listener = (signal: NodeJS.Signals) => {
					child.kill(signal || "SIGTERM");
				};
				this.$eventEmitter.on("stop", listener);
				child.stdout.pipe(stdoutStream);
				child.stderr.pipe(stderrStream);
				stdinStream.pipe(child.stdin);
				child.on("error", (error) => {
					this.$eventEmitter.removeListener("stop", listener);
					reject(error);
				})
				child.on("close", (code) => {
					console.info("Process terminated");
					this.$eventEmitter.removeListener("stop", listener);
					resolve(code || 0);
				})
			});

			await childProcessRun;
			return childProcessRun;
		} catch (error) {
			console.error(error);
			throw error;
		} finally {
			stdinStream.unpipe();
		}
	}
}
