import "mocha";
import {assert} from "chai";
import {readFileSync} from "fs";
import {JavaWebStart} from "../src";
import path from "path";
import {parseXml} from "libxmljs2";
import {URL} from "url";

describe("The JavaWebStart package", () => {
	context("Parsing", () => {
		it("Can parse a JNLP file from a string", () => {
			const testData = readFileSync(path.join(__dirname, "sample-jnlp.xml"), {encoding: "utf-8"});
			const jws = JavaWebStart.parse(testData);
			assert.deepEqual(jws.meta, {
				vendor: "Daan Kets",
				title: "Sample JNLP",
				homepage: "http://host.domain",
				jarLocation: "http://host.domain/path/sample.jar",
				mainClass: "sample.MainClass"
			}, "Invalid meta info");
		});
		it("Can be constructed from an XML document", () => {
			const testData = readFileSync(path.join(__dirname, "sample-jnlp.xml"), {encoding: "utf-8"});
			const xml = parseXml(testData);
			const jws = new JavaWebStart(xml);
			assert.deepEqual(jws.meta, {
				vendor: "Daan Kets",
				title: "Sample JNLP",
				homepage: "http://host.domain",
				jarLocation: "http://host.domain/path/sample.jar",
				mainClass: "sample.MainClass"
			}, "Invalid meta info");
		});
		it("Can load a file", async() => {
			const jws = await JavaWebStart.downloadJNLP(new URL("file://" + path.join(__dirname, "sample-jnlp.xml")));
			assert.deepEqual(jws.meta, {
				vendor: "Daan Kets",
				title: "Sample JNLP",
				homepage: "http://host.domain",
				jarLocation: "http://host.domain/path/sample.jar",
				mainClass: "sample.MainClass"
			}, "Invalid meta info");
		});
	});
	context("Downloading", () => {
		it("Can download a hosted JNLP file", () => {

		});
	});
});
