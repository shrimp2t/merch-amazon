const caminte = require('caminte');
const Schema = caminte.Schema;
const config = require('../config');
const colors = require('colors');
require('events').EventEmitter.prototype._maxListeners = 0;
var dateFormat = require('dateformat');

const DBconfig = {
	driver: 'mysql', // mariadb
	host: config.mysql.host,
	port: config.mysql.port,
	username: config.mysql.username,
	password: config.mysql.password,
	database: config.mysql.database,
	pool: true // optional for use pool directly
};

const dbSchema = new Schema(DBconfig.driver, DBconfig);
global.DbSchema = dbSchema;

// define models
var Product = dbSchema.define(
	'wp_ma_products',
	{
		id: { type: dbSchema.Number },
		name: { type: dbSchema.String, limit: 1000, index: true },
		sku: { type: dbSchema.String, limit: 255 },
		price: { type: dbSchema.Float },
		link: { type: dbSchema.Text },
		check_page: { type: dbSchema.Boolean, default: false },
		last_check_date: { type: dbSchema.Date },
		created: { type: dbSchema.Date, default: Date.now },
		updated: { type: dbSchema.Date }
	},
	{
		primaryKeys: [ 'id' ]
	}
);

// define models
var CatLink = dbSchema.define(
	'wp_ma_cat_links',
	{
		id: { type: dbSchema.Number },
		date_id: { type: dbSchema.Text },
		title: { type: dbSchema.Text },
		link: { type: dbSchema.Text },
		products: { type: dbSchema.Number },
		created: { type: dbSchema.Date, default: Date.now }
	},
	{
		primaryKeys: [ 'id' ]
	}
);

CatLink.insertTrack = function(unixDate, numberProduct, title, link) {
	CatLink.findOrCreate(
		{
			date_id: unixDate
		},
		{
			title: title,
			products: numberProduct,
			link: link
		},
		function(err, p) {
			// your code here
			if (!err) {
				console.log(colors.green('Saved: ' + unixDate));
			} else {
				console.log(colors.red('Inser link error: ', err));
			}
		}
	);
};

Product.inserList = function(listProducts) {
	if (listProducts.length) {
		for (let i = 0; i <= listProducts.length; i++) {
			let item = listProducts[i];
			this.findOrCreate(
				{
					sku: item.sku
				},
				{
					name: item.name,
					link: item.url
				},
				function(err, p) {
					// your code here
					if (!err) {
						console.log('Product added: ', p);
					} else {
						console.log('Inser product error: ', err);
					}
				}
			);
		}
	}
};

var Proxy = dbSchema.define('wp_proxies', {
	id: { type: dbSchema.Number },
	ip: { type: dbSchema.String, limit: 50 },
	port: { type: dbSchema.String, limit: 50 },
	code: { type: dbSchema.String, limit: 20 },
	status: { type: dbSchema.String, limit: 10 },
	username: { type: dbSchema.String, limit: 100 },
	password: { type: dbSchema.String, limit: 100 },
	app_using: { type: dbSchema.String, limit: 20, default: 'no' },
	last_update: { type: dbSchema.Date, default: Date.now },
	last_use: { type: dbSchema.Date, default: Date.now }
});

Proxy.getList = function() {
	return new Promise((resolve) => {
		Proxy.all({ limit: 30 }, function(err, items) {
			if (err) {
				return [];
			}
			resolve(items);
		});
	});
};


Proxy.getUnusing = function() {
	return new Promise((resolve) => {
		Proxy.findOne(
			{
				limit: 1,
				order: 'RAND()',
				where: {
					app_using: {
						like: 'no'
					}
				}
			},
			function(err, item) {
				if (err) {
					console.log( 'Err get proxy: ', err );
					resolve(false);
				}

				try {
					Proxy.update(
						{
							where: {
								id: item.id
							}
						},
						{
							app_using: 'yes'
						},
						function(err, it) {
							// your code here
							if ( err ) {
								console.log( 'ERR update Update proxy using: ' );
							} else {
								console.log( 'Update proxy using: ', item.id );
							}
							
						}
					);
				} catch ( e ) {

				}

				resolve(item);
			}
		);
	});
};


var Flag = dbSchema.define('wp_check_flags', {
	unix_id: { type: dbSchema.Number },
	checked: { type: dbSchema.String },
	date: { type: dbSchema.Date }
});

Flag.getUncheck = function() {
	return new Promise((resolve) => {
		Flag.findOne(
			{
				limit: 1,
				order: 'unix_id ASC',
				where: {
					checked: {
						like: 'no'
					}
				}
			},
			function(err, item) {
				if (err) {
					return false;
				}

				Flag.update(
					{
						where: {
							unix_id: item.unix_id
						}
					},
					{
						checked: 'checking'
					},
					function(err, it) {
						// your code here
						if ( err ) {
							console.log( 'ERR update Update checking: ' );
						} else {
							console.log( 'Update checking: ', item.unix_id );
						}
						
					}
				);

				resolve(item);
			}
		);
	});
};

Flag.updateFlagCheck = function(unix_id) {
	return new Promise((resolve) => {
		Flag.update(
			{
				limit: 1,
				where: {
					unix_id: {
						'=': unix_id
					}
				}
			},
			{
				checked: 'yes'
			},
			function(err, item) {
				if (err) {
					console.log('Err:', err);
					resolve(false);
				}
				console.log('Update UnixID:', unix_id); 
				resolve(true);
			}
		);
	});
};

Flag.toDayFlags = function() {
	// let now = new Date();
	// let today = dateFormat(now, 'yyyy-mm-dd');
	// console.log( 'Call this' );
	// try {
	// 	var i = 1;
	// 	let t = setTimeout( function(){
	// 		let count = 0;
	// 		while( count<= 100 ) {
	// 			count++;
	// 			i++;
	// 			Flag.findOrCreate(
	// 				{
	// 					unix_id: i
	// 				},
	// 				{
	// 					checked: 'no',
	// 					date: today
	// 				},
	// 				function(err, p) {
	// 					if ( ! err ) {
	// 						console.log( 'Added: ',  );
	// 					} else {
	// 						console.log( 'ERR: ', err );
	// 					}
	// 				}
	// 			);
	// 		}
	// 	}, 500 );
	// } catch( e ) {
	// 	console.log( 'Catch ERR: ', err );
	// }
};

module.exports = {
	Product,
	CatLink,
	Proxy,
	Flag
};
