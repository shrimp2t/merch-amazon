const puppeteer = require('puppeteer');
const colors = require('colors');

const config = require('../config');
const { Product, CatLink } = require('../models/models');

async function changeZipCode(page) {
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
}

async function getPageProducts(page) {
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
}

async function crawlUrlsByUnixDate(unixDateFrom, unixDateTo, proxy) {
	let broswerArgs = [
		// '--proxy-server=127.0.0.1:9876',
		'--window-size=1024,860',
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-dev-shm-usage',
		'--disable-accelerated-2d-canvas',
		'--disable-gpu'
	];

	let userProxyPwd = false;
	if (proxy) {
		if (typeof proxy === 'string') {
			broswerArgs.push('--proxy-server=' + proxy );
		} else {
			userProxyPwd = true;
			broswerArgs.push('--proxy-server=' + proxy.ip);
		}
	}

	try {
		const browser = await puppeteer.launch({
			headless: config.headless,
			args: broswerArgs
		});

		const pages = await browser.pages();
		if ( pages.length ) {
			pages[0].close();
		};
		
		let UserAgent =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';
		const page = await browser.newPage();

		if ( userProxyPwd ) {
			await page.authenticate({username:proxy.username, password: proxy.password});
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

		// ------ ZIP code -------
		// Change zip code if do not user proxy
		if ( ! proxy ) {
			await page.goto('https://www.amazon.com/');
			await page.waitFor(1000);
			await changeZipCode(page);
			await page.waitFor(2000); // do nothing just stop for test
		}
		// ------END  ZIP code ------

		let checkingUnixDate = unixDateFrom;
		let countToDelay = 0;

		while (checkingUnixDate <= unixDateTo) {
			let qid = Math.round(+new Date() / 1000);
			let link = config.linkFormat.replace(/{{qid}}/gi, qid);
			link = link.replace(/{{date_abs}}/gi, checkingUnixDate);
			checkingUnixDate += 1;

			console.log('Check Link: ', link);
			await page.goto(link);
			countToDelay++;

			if (countToDelay >= config.checkDelay) {
				countToDelay = 0;
				console.log(colors.yellow('Delay for robot check -----------'));
				await page.waitFor(13000);
			}

			try {
				let titleHandle = await page.$('title');

				// pass the single handle below
				const text = await page.evaluate((el) => el.innerText, titleHandle);
				if ('Robot Check' == text) {
					console.log(colors.red('Robot check: ' + checkingUnixDate));
					countToDelay = 0;
					await page.waitForNavigation();
					// ------ ZIP code -------
					await changeZipCode(page);
					await page.waitFor(15000); // do nothing just stop for test
				}

				const products = getPageProducts(page);

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

			await page.waitFor(1200);
		}

		browser.close();
	} catch (error) {
		console.log('Catch : ' + error);
	}
}

async function crawListProduct(page) {
	const products = await page.evaluate(() => {
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

	return products;
}

async function crawNextPage(page) {
	// data-component-type
	const currentPage = await page.$('span[data-component-type="s-pagination"] ul.a-pagination li.a-selected');

	const sibling = await currentPage.$x('following-sibling::li');

	//*[@id="search"]/div[1]/div[2]/div/span[7]/div/div/div/ul/li[3]

	if (sibling.length) {
		return await sibling[0].$('a');
	}

	return false;
}

module.exports = {
	crawlUrlsByUnixDate,
	changeZipCode,
	getPageProducts,
	crawListProduct,
	crawNextPage
};
