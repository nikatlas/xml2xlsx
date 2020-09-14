"use strict";

const Axios = require('axios');
const xml = require('xml2js');
const XLSX = require('xlsx');

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "xml2xlsx",
	// version: 1

	/**
	 * Mixins
	 */
	mixins: [],

	/**
	 * Settings
	 */
	settings: {
		// Available fields in the responses
		fields: [
			"_id",
			"name",
			"quantity",
			"price"
		],

		// Validator for the `create` & `insert` actions.
		entityValidator: {
			name: "string|min:3",
			price: "number|positive"
		}
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

		downloadCSV: {
			rest: "GET /convert",
			params: {
				url: "string"
			},
			async handler(ctx) {
				ctx.meta.$responseType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
				ctx.meta.$responseHeaders = {
					"Content-Disposition": "attachment; filename=data.xlsx"
				};


				// axios image download with response type "stream"
				const response = await Axios({
					method: "GET",
					url: ctx.params.url,
					//responseType: 'stream'
				});
				/* create a new blank workbook */
				const wb = XLSX.utils.book_new();

				const res = await xml.parseStringPromise(response.data);
				const arr = res["beautyhome"]["products"][0]["product"];
				const fields = Object.keys(arr[0]);
				for(let i in arr){
					for(let j in fields) {	
						arr[i][fields[j]] = arr[i][fields[j]][0];
					}
				}
				const xl = await XLSX.utils.json_to_sheet(arr);
				/* Add the worksheet to the workbook */
				XLSX.utils.book_append_sheet(wb, xl, "beautyhome");

				return XLSX.write(wb, {
					type: "buffer"
				});
			}
		},

		/**
		 * Increase the quantity of the product item.
		 */
		increaseQuantity: {
			rest: "PUT /:id/quantity/increase",
			params: {
				id: "string",
				value: "number|integer|positive"
			},
			async handler(ctx) {
				const doc = await this.adapter.updateById(ctx.params.id, { $inc: { quantity: ctx.params.value } });
				const json = await this.transformDocuments(ctx, ctx.params, doc);
				await this.entityChanged("updated", json, ctx);

				return json;
			}
		},

		/**
		 * Decrease the quantity of the product item.
		 */
		decreaseQuantity: {
			rest: "PUT /:id/quantity/decrease",
			params: {
				id: "string",
				value: "number|integer|positive"
			},
			/** @param {Context} ctx  */
			async handler(ctx) {
				const doc = await this.adapter.updateById(ctx.params.id, { $inc: { quantity: -ctx.params.value } });
				const json = await this.transformDocuments(ctx, ctx.params, doc);
				await this.entityChanged("updated", json, ctx);

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
			await this.adapter.insertMany([
				{ name: "Samsung Galaxy S10 Plus", quantity: 10, price: 704 },
				{ name: "iPhone 11 Pro", quantity: 25, price: 999 },
				{ name: "Huawei P30 Pro", quantity: 15, price: 679 },
			]);
		}
	},

	/**
	 * Fired after database connection establishing.
	 */
	async afterConnected() {
		// await this.adapter.collection.createIndex({ name: 1 });
	}
};
