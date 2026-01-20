import {existsSync, readFileSync, statSync} from "fs";
import {JavaWebStart} from "../src";
import path from "path";
import {parseXml} from "libxmljs2";
import {URL} from "url";
import {WritableStringBuffer} from "../src/writableStringBuffer";
import {expect, describe} from "@jest/globals";

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
	describe("Parsing", () => {
		it("Can parse a JNLP file from a string", () => {
			const testData = readFileSync(path.join(__dirname, "sample.jnlp"), {encoding: "utf-8"});
			const jws = JavaWebStart.parse(testData);
			expect(jws.meta).toEqual(EXPECTED_META_INFO);
		});
		it("Can be constructed from an XML document", () => {
			const testData = readFileSync(path.join(__dirname, "sample.jnlp"), {encoding: "utf-8"});
			const xml = parseXml(testData);
			const jws = new JavaWebStart(xml);
			expect(jws.meta).toEqual(EXPECTED_META_INFO);
		});
		it("Can load a local file", async() => {
			const jws = await JavaWebStart.downloadJNLP(new URL("file://" + path.join(__dirname, "sample.jnlp")));
			expect(jws.meta).toEqual(EXPECTED_META_INFO);
		});
	});
	describe("Downloading", () => {
		it("Can download a hosted JNLP file", async() => {
			const jws = await JavaWebStart.downloadJNLP(new URL(JNLP_URL));
			expect(jws.meta).toEqual(EXPECTED_META_INFO);
		});
		it("Can download a hosted JAR file", async() => {
			const jws = await JavaWebStart.downloadJNLP(new URL(JNLP_URL));
			const localFiles = await jws.download();
			expect(localFiles[0]).toEqual(path.join(process.cwd(), "sample.jar"));
			expect(existsSync(localFiles[0])).toBe(true);
			const stats = statSync(localFiles[0]);
			expect(stats.isFile()).toBe(true);
			expect(stats.size).toEqual(753);
		});
		it("Can run a hosted JAR file", async() => {
			let output = new WritableStringBuffer();

			const jws = await JavaWebStart.downloadJNLP(new URL(JNLP_URL));

			const result = await jws.run({trust: true, stdout: output});
			await output.end();
			expect(result).toEqual(0);
			expect(output.toString()).toEqual("Hello, world!\n");
		});
	});
});
