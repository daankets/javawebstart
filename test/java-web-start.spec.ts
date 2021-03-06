import "mocha";
import {assert} from "chai";
import {existsSync, readFileSync, statSync} from "fs";
import {JavaWebStart} from "../src";
import path from "path";
import {parseXml} from "libxmljs2";
import {URL} from "url";
import {Writable} from "stream";
import {WritableStringBuffer} from "../src/writableStringBuffer";

const JNLP_URL = "https://raw.githubusercontent.com/daankets/javawebstart/develop/test/sample.jnlp";
const JAR_URL = "https://raw.githubusercontent.com/daankets/javawebstart/develop/test/sample.jar";
const EXPECTED_META_INFO = Object.freeze({
	vendor: "Daan Kets",
	title: "Sample JNLP",
	homepage: "https://github.com/daankets/javawebstart",
	jarLocations: [{jarName:"sample.jar",jarLocation:JAR_URL}],
	mainClass: "MainClass"
});

describe("The JavaWebStart package", function() {
	this.timeout(10000);
	context("Parsing", () => {
		it("Can parse a JNLP file from a string", () => {
			const testData = readFileSync(path.join(__dirname, "sample.jnlp"), {encoding: "utf-8"});
			const jws = JavaWebStart.parse(testData);
			assert.deepEqual(jws.meta, EXPECTED_META_INFO, "Invalid meta info");
		});
		it("Can be constructed from an XML document", () => {
			const testData = readFileSync(path.join(__dirname, "sample.jnlp"), {encoding: "utf-8"});
			const xml = parseXml(testData);
			const jws = new JavaWebStart(xml);
			assert.deepEqual(jws.meta, EXPECTED_META_INFO, "Invalid meta info");
		});
		it("Can load a local file", async() => {
			const jws = await JavaWebStart.downloadJNLP(new URL("file://" + path.join(__dirname, "sample.jnlp")));
			assert.deepEqual(jws.meta, EXPECTED_META_INFO, "Invalid meta info");
		});
	});
	context("Downloading", () => {
		it("Can download a hosted JNLP file", async() => {
			const jws = await JavaWebStart.downloadJNLP(new URL(JNLP_URL));
			assert.deepEqual(jws.meta, EXPECTED_META_INFO, "Invalid meta info");
		});
		it("Can download a hosted JAR file", async() => {
			const jws = await JavaWebStart.downloadJNLP(new URL(JNLP_URL));
			const localFiles = await jws.download();
			assert.equal(localFiles[0], path.join(process.cwd(), "sample.jar"));
			assert.isTrue(existsSync(localFiles[0]), "File does not exist!");
			const stats = statSync(localFiles[0]);
			assert.isTrue(stats.isFile(), "Not a file!");
			assert.equal(stats.size, 753, "File size does not match");
		});
		it("Can run a hosted JAR file", async() => {
			let output = new WritableStringBuffer();

			const jws = await JavaWebStart.downloadJNLP(new URL(JNLP_URL));

			const result = await jws.run({trust: true, stdout: output});
			await output.end();
			assert.equal(result, 0, "Error code must be 0!");
			assert.equal(output.toString(), "Hello, world!\n", "Wrong output!");
		});
	});
});
