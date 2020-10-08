"use strict";

const Axios = require("axios");
const XLSX = require("xlsx");
const utf8 = require("utf8");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
function toUtf8(badstr) {
	try {
		let s =  utf8.decode(badstr);
		return s;
	} catch (e) {

		return badstr;
	}
}
module.exports = {
	name: "xlsx",
	version: 1,

	/**
	 * Mixins
	 */
	mixins: [],

	/**
	 * Settings
	 */
	settings: {
		
	},

	/**
	 * Action Hooks
	 */
	hooks: {
		before: {
			/**
			 * Register a before hook for the `create` action.
			 * It sets a default value for the quantity field.
			 *
			 * @param {Context} ctx
			 */
			create(ctx) {
				ctx.params.quantity = 0;
			}
		}
	},

	/**
	 * Actions
	 */
	actions: {
		/**
		 * The "moleculer-db" mixin registers the following actions:
		 *  - list
		 *  - find
		 *  - count
		 *  - create
		 *  - insert
		 *  - update
		 *  - remove
		 */

		// --- ADDITIONAL ACTIONS ---

		convert: {
			rest: "GET /convert/json",
			params: {
				url: "string",
				sheet: "string",
				file: { type:"string", optional:true }
			},
			async handler(ctx) {
				ctx.meta.$responseType = "application/json";
				if(ctx.params.file == "true") {
					ctx.meta.$responseHeaders = {
						"Content-Type": "application/json",
						"Content-Disposition": "attachment; filename=data.json"
					};
				}

				// axios image download with response type "stream"
				const response = await Axios({
					method: "GET",
					url: ctx.params.url,
					responseType: "arraybuffer"
				});

				const data = new Uint8Array(response.data);
				const workbook = XLSX.read(data, {type:"array"});
				const json = await XLSX.utils.sheet_to_json(workbook.Sheets[ctx.params.sheet]);
				return json;
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Loading sample data to the collection.
		 * It is called in the DB.mixin after the database
		 * connection establishing & the collection is empty.
		 */
		async seedDB() {
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
