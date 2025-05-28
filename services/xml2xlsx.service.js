"use strict";
const https = require("https");
const Axios = require("axios");
const xml = require("xml2js");
const XLSX = require("xlsx");
const utf8 = require("utf8");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */
function toUtf8(badstr) {
	try {
		let s =  utf8.decode(badstr);
		// console.log("SUCCESS" , s);
		return s;
	} catch (e) {

		return badstr;
	}
}


/**
 * Handle field value if is array or object or single string
 */
function toSingleString(field) {
	if (field === undefined || field === null) {
		return "";
	}
	if(typeof field === "string") {
		return field;
	} else if (Array.isArray(field)) {
		return toSingleString(field[0]);
	} else if (field["_"]) {
		return field["_"];
	}

	return field;
}

module.exports = {
	name: "xml2xlsx",
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
			rest: "GET /convert",
			params: {
				url: "string",
				path: "string",
				swap: "string",
				splitter: "string"
			},
			async handler(ctx) {
				console.info(`at ${new Date().toISOString()}: XML2XLSX convert starting`);
				ctx.meta.$responseType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
				ctx.meta.$responseHeaders = {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"Content-Disposition": "attachment; filename=data.xlsx"
				};

				// axios image download with response type "stream"
				const response = await Axios({
					method: "GET",
					url: ctx.params.url,
					//responseType: 'stream'
				});
				console.info(`at ${new Date().toISOString()}: File fetched from ${ctx.params.url}`);
				/* create a new blank workbook */
				const wb = XLSX.utils.book_new();

				const res = await xml.parseStringPromise(response.data);


				let path = ctx.params.path.split(".");
				//const arr = res["beautyhome"]["products"][0]["product"];
				let temp = res;
				for(let k in path) {
					temp = temp[path[k]];
				}
				const arr = temp || [];

				const swaps = JSON.parse(ctx.params.swap || "{}");
				const delimiters = JSON.parse(ctx.params.splitter || "{}");
				const fields = Object.keys(arr[0]);
				for(let i in arr){
					const product = arr[i];
					for(let j in fields) {
						const field_value = toSingleString(product[fields[j]]);
						let temp_value = swaps[field_value] ? swaps[field_value] : field_value;
						temp_value = delimiters[fields[j]] ? temp_value.split(delimiters[fields[j]])[0] : temp_value;
						arr[i][fields[j]] = toUtf8(temp_value);
					}
				}
				console.info(`at ${new Date().toISOString()}: Converting file to sheet`);
				const xl = await XLSX.utils.json_to_sheet(arr);
				/* Add the worksheet to the workbook */
				XLSX.utils.book_append_sheet(wb, xl, "Sheet 1");

				console.info(`at ${new Date().toISOString()}: Writing result workbook to buffer`);
				return XLSX.write(wb, {
					type: "buffer"
				});
			}
		},

		rssconvert: {
			rest: "GET /rssconvert",
			params: {
				url: "string",
				path: "string",
				swap: "string",
				splitter: "string"
			},
			async handler(ctx) {
				ctx.meta.$responseType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
				ctx.meta.$responseHeaders = {
					"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"Content-Disposition": "attachment; filename=data.xlsx"
				};

				// axios image download with response type "stream"
				const response = await Axios({
					method: "GET",
					url: ctx.params.url,
					httpsAgent: new https.Agent({
						rejectUnauthorized: false
					}),
					//responseType: 'stream'
				});


				/* create a new blank workbook */
				const wb = XLSX.utils.book_new();
				const res = await xml.parseStringPromise(response.data);
				let results = [];

				let model = {};
				for(let c in res.rss.channel) {
					for(let i in res.rss.channel[c].item) {
						let item = res.rss.channel[c].item[i];
						if(!item.option)
							continue;
						let arr = item.option.map((op) => op.option_name[0]);
						arr.forEach((itema) => {
							model[itema] = "";
						});
					}
				}
				for(let c in res.rss.channel) {
					for(let i in res.rss.channel[c].item){
						let item = res.rss.channel[c].item[i];
						let fitem = {
							...model,
							title: item.title[0],
							link: item.link[0],
							description: item.description[0],
							collection: item.collection[0],
							image_link: item.image_link && item.image_link.join(";"),
							model_number: item.model_number[0],
							mpn: item.mpn[0],
							category: item.category && item.category.join(">"),
							quantity: item.quantity[0],
							weight: item.weight[0],
							price: item.price[0],
							availability: item.availability[0]
						};
						// if(item.title[0] == "Διακοσμιτικό Ριχτάρι Letters 04"){
						// 	console.log("M:",item.option);
						// 	return;
						// }

						if(!item.option || item.option.length == 0){
							results.push(fitem);
							continue;
						}

						let headers = item.option.reduce((p,node) => {
							p[node.option_name[0]] = node;
							return p;
						}, {});
						let hd = headers["Διάσταση"];
						// console.log("HD",hd, headers);
						for (let i = 0; hd && i < hd.option_value.length; i++) {
							let dim = hd.option_value[i];
							let dimimp = dim.option_value_price[0];
							fitem["Διάσταση"] = dim.option_value_name[0];
							if(fitem["Διάσταση"] == "Επιθυμητή διάσταση")
								continue;
							fitem.price = parseFloat(item.price[0]);
							fitem.price = parseFloat(fitem.price) + ((dim.option_value_price_prefix[0] == "+") ? parseFloat(dimimp) : (-parseFloat(dimimp)));
							results.push({...fitem});
						}

						let hp = headers["Πλάτος"];
						let hm = headers["Μήκος"];
						for (let j = 0; hp && j < hp.option_value.length; j++) {
							for (let i = 0; hm && i < hm.option_value.length; i++) {
								let mikos = hm.option_value[i];
								let mikosimpact = mikos.option_value_price[0];
								let platos = hp.option_value[j];
								let platosimpact = platos.option_value_price[0];

								fitem["Διάσταση"] = "Επιθυμητή διάσταση";
								fitem["Μήκος"] = mikos.option_value_name[0];
								fitem["Πλάτος"] = platos.option_value_name[0];
								fitem.price = parseFloat(item.price[0]);
								fitem.price = parseFloat(fitem.price) + ((mikos.option_value_price_prefix[0] == "+") ? parseFloat(mikosimpact) : (-parseFloat(mikosimpact)));
								fitem.price = parseFloat(fitem.price) + ((platos.option_value_price_prefix[0] == "+") ? parseFloat(platosimpact) : (-parseFloat(platosimpact)));
								results.push({...fitem});
							}
						}



						// let optionSizes = item.option.map(node => node.option_value.length);
						// let counter = optionSizes.map(s => 0);
						// const lastbait = optionSizes.length;
						// counter[counter.length] = 0;
						// do {
						// 	fitem.price = parseFloat(item.price[0]);
						// 	let skipFlag = false;
						// 	for(let o=0;o<item.option.length;o++) {
						// 		let opt = item.option[o];
						// 		let name = opt.option_name[0];
						// 		let cval = opt.option_value[counter[o]];
						// 		let pimpact = cval.option_value_price[0];
						// 		fitem[name] = cval.option_value_name[0];
						// 		fitem.price = parseFloat(fitem.price) + ((cval.option_value_price_prefix[0] == "+") ? parseFloat(pimpact) : (-parseFloat(pimpact)));
						// 		skipFlag = skipFlag || (fitem[name]=="Επιθυμητή διάσταση");
						// 	}
						// 	if(!skipFlag){
						// 		results.push({...fitem});
						// 	}
						// 	counter[0]++;
						// 	let p =0;
						// 	while(counter[p] == optionSizes[p]){
						// 		counter[p] = 0;
						// 		p++;
						// 		counter[p]++;
						// 	}
						// } while(counter[lastbait] == 0);
					}
				}

				const xl = await XLSX.utils.json_to_sheet(results);
				/* Add the worksheet to the workbook */
				XLSX.utils.book_append_sheet(wb, xl, "Data");

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
