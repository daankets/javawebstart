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

export class JavaWebStart {

	/**
	 * Creates a new JavaWebStart instance, using the location of a JNLP file.
	 * @param jnlpXML The XML Document for the JNLP file
	 */
	constructor(private readonly jnlpXML: Document) {
	}

	/**
	 * Downloads a JNLP file from a url. This can be a file url.
	 * @param jnlpLocation http(s) or local location of the JNLP file.
	 */
	static async downloadJNLP(jnlpLocation: URL) {
		let data: string | null = null;
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

	static parse(data: string): JavaWebStart {
		return new JavaWebStart(parseXml(data));
	}

	get title(): string {
		return (this.jnlpXML.get("//information/title") as Text)?.text();
	}

	get vendor(): string | null {
		return (this.jnlpXML.get("//information/vendor") as Text)?.text();
	}

	get homepage(): string | null {
		return (this.jnlpXML.get("//information/homepage") as Element)?.attr("href")?.value() || null;
	}

	get jarLocation(): string {
		const codebase = this.jnlpXML.root()?.attr("codebase")?.value();
		return `${codebase}/${this.jarName}`;
	}

	get jarName(): string | null {
		return (this.jnlpXML.get("//resources/jar") as Element)?.attr("href")?.value() || null;
	}

	get mainClass(): string | null {
		return (this.jnlpXML.get("//application-desc") as Element)?.attr("main-class")?.value() || null;
	}

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
	 * Calling stop will stop any running java process, and return a promise.
	 */
	async stop(): Promise<void> {

	}

	static async fromArgv(...args: string[]): Promise<JavaWebStart> {
		if (args.length < 3) {
			console.warn("Usage: javawebstart <jnlpUrl>")
			throw new Error("Missing URL");
		}
		return JavaWebStart.downloadJNLP(new URL(args[2]));
	}

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

			const request = http.get(jarLocation,{
				abort: abortController && abortController.signal
			}, (res) => {
				let counter = 0;
				let progress: SingleBar | null = null;
				let writeStream: WriteStream;
				if (res.headers["content-length"]) {
					const contentLength = parseInt(res.headers["content-length"]);
					if (cachedLength && cachedLength === contentLength) {
						console.debug("Cached version found at %s. Running from cache...", targetLocation);
						abortController ? abortController.abort() : request.abort();
						resolve(targetLocation);
						return;
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

	async run(jarLocation?: string): Promise<number> {
		const jarPath = jarLocation || await this.download();
		if (!fs.existsSync(jarPath)) {
			throw new Error("Jar file not found!");
		}
		if (!this.mainClass) {
			throw new Error("No main class specified");
		}
		console.info("Starting Java Web Start...");
		let childProcessRun: Promise<number>;
		try {
			childProcessRun = new Promise<number>((resolve, reject) => {
				const child = spawn("java", ["-cp", jarPath.toString(), this.mainClass as string], {});
				child.stdout.pipe(process.stdout);
				child.stderr.pipe(process.stderr);
				process.stdin.pipe(child.stdin);
				child.on("error", (error) => {
					reject(error);
				})
				child.on("close", (code) => {
					console.info("Process terminated");
					resolve(code || 0);
				})
			});
			await childProcessRun;
			return childProcessRun;
		} catch (error) {
			console.error(error);
			throw error;
		} finally {
			process.stdin.unpipe();
		}
	}
}
