import {StringDecoder} from "string_decoder";
import {Writable} from "stream";

export class WritableStringBuffer extends Writable {
	private $buffer = "";

	constructor() {
		super({emitClose:true});
	}

	_write(chunk: any, encoding: BufferEncoding, callback: (error?: (Error | null)) => void) {
		this.$buffer += new StringDecoder().write(chunk);
	}

	public toString(): string {
		return this.$buffer;
	}
}
