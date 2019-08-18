const puppeteer = require('puppeteer');
const colors = require('colors');
const config = require('../config');
const events = require('events');
const { Product, CatLink, Flag, Proxy } = require('../models/models');

const Browser = function() {
	let scope = this;

	scope.count = 0;
	scope.browsers = [];
	scope.listProxies = [];
	scope.eventEmitter = new events.EventEmitter();
	scope.startUnix = 0;

	scope.setTodayUnix = function(unix) {
		scope.startUnix = unix;
	};

	/**
	 * Event new.
	 */
	scope.on = function(event, callback) {
		scope.eventEmitter.on(event, callback);
	};

	scope.setProxies = function(proxies) {
		proxies.map((proxy, index) => {
			let pi = {
				ip: proxy.ip,
				username: proxy.username,
				password: proxy.password,
				using: false,
				blocked: false,
				index: index
			};
			scope.listProxies[index] = pi;
		});
	};

	scope.getProxy = async function() {
		const proxy = await Proxy.getUnusing();
		if (proxy) {
			let pi = {
				ip: proxy.ip,
				port: proxy.port,
				username: proxy.username,
				password: proxy.password,
				using: false,
				blocked: false,
				id: proxy.id
			};
			return pi;
		}

		return null;
	};

	scope.setProxyUsing = async function(proxy, isUsing) {
		return new Promise((resolve) => {
			Proxy.update(
				{
					id: proxy.id
				},
				{
					app_using: isUsing ? 'yes' : 'no'
				},
				function(err, item) {
					if (err) {
						console.log( 'Err get proxy: ', err );
						return resolve( false );
					}

					console.log( 'Release Proxy: ', proxy.id );
	
					resolve(true);
				}
			);
		});
	};

	scope.countNumber = function() {
		return this.count;
	};

	scope.changeZipCode = async function(page) {
		try {
			const d_button = await page.$('.nav-a.nav-a-2.a-popover-trigger.a-declarative');
			if (d_button) {
				await d_button.click();
				await page.waitFor(3000);

				// Set Zip code location.
				const inputLocation = await page.$('#GLUXZipUpdateInput');
				if (inputLocation.length) {
					await page.evaluate(
						(el, zip_code) => {
							el.value = zip_code;
						},
						inputLocation,
						config.zipCode
					);

					await page.waitFor(500); // wait for ajax loaded.

					// Click to submit button
					const submit_btn = await page.$('#GLUXZipInputSection input.a-button-input[type="submit"]');
					if (submit_btn) {
						await submit_btn.click();
					}

					await page.waitFor(3000); // wait for ajax loaded
					const continue_btn = await page.$('#GLUXConfirmClose');
					if (continue_btn) {
						await page.evaluate((el) => {
							el.click();
						}, continue_btn);
						// await continue_btn.click();
						await page.waitForNavigation();
					} else {
						console.log('continue_btn not found');
					}
				} // end if input zipcode length
			}
		} catch (e) {
			// No input location.
		}
	};

	scope.getPageProducts = async function(page) {
		return await page.evaluate(() => {
			var items = [];
			const productsWrapper = document.querySelector('.s-result-list.s-search-results');
			console.log('productsWrapper', productsWrapper);
			const list = productsWrapper.querySelectorAll('.s-result-item');
			for (let i = 0; i < list.length; i++) {
				let p = list[i];
				let item = {};
				let a = p.querySelector('a.a-link-normal');
				item.sku = p.getAttribute('data-asin');
				item.url = a.getAttribute('href');
				item.name = a.innerText;
				items.push(item);
			}
			return items;
		});
	};

	scope.closeBrowser = function(browser) {
		try {
			if (this.count) {
				this.count--;
			}
			if (browser) {
				browser.close();
			}

			scope.eventEmitter.emit('browser_closed', this );
		} catch (e) {}
	};

	scope.add = async function() {
		this.count++;

		console.log( 'scope.count: ', scope.count );

		proxy = await scope.getProxy();

		let broswerArgs = [
			'--window-size=1024,860',
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-accelerated-2d-canvas',
			'--disable-gpu'
		];

		console.log('Using Proxy: ', proxy);

		let userProxyPwd = false;
		if (proxy) {
			if (typeof proxy === 'string') {
				console.log('--proxy-server=' + proxy);
				broswerArgs.push('--proxy-server=' + proxy);
			} else {
				userProxyPwd = true;
				console.log('User Proxy and PWD: ' + proxy.ip);
				broswerArgs.push('--proxy-server=' + proxy.ip + ':' + proxy.port);
			}
		}

		scope.setProxyUsing(proxy, true);
		let browser;
		try {
			browser = await puppeteer.launch({
				headless: config.headless,
				args: broswerArgs
			});

			scope.browsers.push(browser);
			let checkingUnixDate;
			let uncheck_unix = await Flag.getUncheck();
			if (!uncheck_unix) {
				scope.closeBrowser(browser); // All checked
			} else {
				checkingUnixDate = uncheck_unix.unix_id;
			}

			const pages = await browser.pages();
			if (pages.length) {
				// pages[0].close();
			}

			scope.eventEmitter.emit('browser_launch', browser);

			let UserAgent =
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
			const page = await browser.newPage();

			if (userProxyPwd) {
				await page.authenticate({ username: proxy.username, password: proxy.password });
				await page.waitFor(2000);
			}
			await page.setRequestInterception(true);
			page.on('request', (request) => {
				const requestUrl = request._url.split('?')[0].split('#')[0];
				if (
					config.blockedResourceTypes.indexOf(request.resourceType()) !== -1 ||
					config.skippedResources.some((resource) => requestUrl.indexOf(resource) !== -1)
				) {
					request.abort();
				} else {
					request.continue();
				}
			});
			await page.setUserAgent(UserAgent);
			await page.setViewport({
				width: 1024,
				height: 860
			});

			// Change zip code if do not user proxy
			if (!proxy) {
				await page.goto('https://www.amazon.com/');
				await page.waitFor(1000);
				await scope.changeZipCode(page);
				await page.waitFor(2000); // do nothing just stop for test
			}

			let countToDelay = 0;

			while (checkingUnixDate) {
				checkingUnixDate = scope.startUnix + checkingUnixDate;
				let qid = Math.round(+new Date() / 1000);
				let link = config.linkFormat.replace(/{{qid}}/gi, qid);
				link = link.replace(/{{date_abs}}/gi, checkingUnixDate);

				console.log('Checking ID %s, LINK: ', checkingUnixDate, link);
				await page.goto(link);
				countToDelay++;

				if (countToDelay >= config.checkDelay) {
					countToDelay = 0;
					console.log(colors.yellow('Close browser -----------'));
					await scope.setProxyUsing(proxy, false);
					await page.waitFor(2000);
					checkingUnixDate = false;
				}

				try {
					let titleHandle = await page.$('title');

					// pass the single handle below
					const text = await page.evaluate((el) => el.innerText, titleHandle);
					if ('Robot Check' == text) {
						console.log(colors.red('Robot check: ' + checkingUnixDate));
						scope.setProxyUsing(proxy, true);
						scope.closeBrowser(browser);
						checkingUnixDate = null;
					}

					const products = await scope.getPageProducts(page);

					if (products.length) {
						console.log(colors.green('Found: ' + products.length + ' -- Link added: ' + link));

						// Save Link to Db
						if (config.saveDb) {
							CatLink.insertTrack(checkingUnixDate, products.length, text, link);
						}
					} else {
						console.log(colors.grey('No products found'));
					}

					if (!text.indexOf(checkingUnixDate.toString())) {
						console.log(colors.green('Title change: ' + checkingUnixDate));
					} else {
						console.log(colors.grey('Title not change: ' + text));
					}
				} catch (e) {
					console.log('Title not found!');
				}

				await Flag.updateFlagCheck(uncheck_unix.unix_id);

				uncheck_unix = await Flag.getUncheck();
				if (!uncheck_unix) {
					scope.closeBrowser(browser); // All checked
					checkingUnixDate = null;
				} else {
					checkingUnixDate = uncheck_unix.unix_id;
				}

				await page.waitFor(1200);
			} // end while checking date

			scope.closeBrowser(browser); // All checked

		} catch (error) {
			console.log('Catch Browser ERROR: ' + error);
			scope.closeBrowser( browser );
		}
	};
};

module.exports = Browser;
