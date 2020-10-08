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
		// Global CORS settings for all routes
		cors: {
			// Configures the Access-Control-Allow-Origin CORS header.
			origin: "*",
			// Configures the Access-Control-Allow-Methods CORS header. 
			methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
			// Configures the Access-Control-Allow-Headers CORS header.
			allowedHeaders: [],
			// Configures the Access-Control-Expose-Headers CORS header.
			exposedHeaders: [],
			// Configures the Access-Control-Allow-Credentials CORS header.
			credentials: false,
			// Configures the Access-Control-Max-Age CORS header.
			maxAge: 3600
		},
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
