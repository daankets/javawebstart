import "mocha";
import {assert} from "chai";
import {readFileSync} from "fs";
import {JavaWebStart} from "../src";
import path from "path";
import {parseXml} from "libxmljs2";
import {URL} from "url";

const JNLP_URL = "https://raw.githubusercontent.com/daankets/javawebstart/develop/test/sample.jnlp";
const JAR_URL =  "https://raw.githubusercontent.com/daankets/javawebstart/develop/test/sample.jar";
const EXPECTED_META_INFO = Object.freeze({
	vendor: "Daan Kets",
	title: "Sample JNLP",
	homepage: "https://github.com/daankets/javawebstart",
	jarLocation: JAR_URL,
	mainClass: "MainClass"
});

describe("The JavaWebStart package", () => {
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
		it("Can download a hosted JNLP file", async () => {
			const jws = await JavaWebStart.downloadJNLP(new URL(JNLP_URL));
			assert.deepEqual(jws.meta, EXPECTED_META_INFO, "Invalid meta info");
		});
	});
});
