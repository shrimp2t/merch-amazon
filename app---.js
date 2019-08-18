// const express = require('express');
const puppeteer = require('puppeteer');
const { Cluster } = require('puppeteer-cluster');
const colors = require('colors');

const { Product, CatLink, User } = require('./models/models');
// const { crawListProduct, crawNextPage } = require('./actions/list-product');

// const link_url =
// 	'https://www.amazon.com/s?i=fashion-novelty&bbn=12035955011&rh=n%3A7141123011%2Cn%3A7141124011%2Cn%3A7147445011%2Cn%3A12035955011%2Cp_6%3AATVPDKIKX0DER&s=date-desc-rank&lo=visual_grid&dc&page=2&pf_rd_i=12035955011&pf_rd_m=ATVPDKIKX0DER&pf_rd_p=14d51f9e-c6ff-46c0-89e1-08fbb8b57edd&pf_rd_r=DXHWJYPQ0AQQZF3E2XT2&pf_rd_s=mobile-hybrid-2&pf_rd_t=1201&qid=1565481222&ref=is_pn_1';

//const link_url = 'https://www.amazon.com/s?rh=n%3A9103696011%2Cp_6%3AATVPDKIKX0DER&s=date-desc-rank';
const link_url =
	'https://www.amazon.com/s?i=fashion&bbn=7141124011&rh=n%3A7141123011%2Cn%3A%217141124011%2Cn%3A7147445011%2Cp_n_date_first_available_absolute%3A{{date_abs}}%2Cp_6%3AATVPDKIKX0DER&s=date-desc-rank&dc&qid={{qid}}';

(async () => {
	const cluster = await Cluster.launch({
		concurrency: Cluster.CONCURRENCY_CONTEXT,
		maxConcurrency: 2,
		monitor: false,
		puppeteerOptions: {
			headless: false,
			args: [ '--window-size=1024,860' ]
		}
	});

	

	await cluster.task(async ({ page, data: url }) => {
		await page.goto(url);
		await page.waitFor(15000);
		//const screen = await page.screenshot();
		// Store screenshot, do something else 
		console.log( 'Work', url );
	});

	cluster.queue('http://www.google.com/');
	cluster.queue('http://www.wikipedia.org/');
	// many more pages

	// browser.close();

	cluster.queue('http://www.google.com/');
	cluster.queue('http://www.wikipedia.org/');

	await cluster.idle();
	await cluster.close();
})();
