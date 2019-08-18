try {
	const browser = await puppeteer.launch({
		headless: false,
		args: [ '--window-size=1024,860' ]
	});

	let UserAgent =
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';

	const page = await browser.newPage();
	await page.setUserAgent(UserAgent);
	await page.setViewport({
		width: 1024,
		height: 860
	});

	const zip_code = 90213;

	await page.goto('https://www.amazon.com/');
	await page.waitFor(1000);

	// ------ ZIP code -------
	const d_button = await page.$('.nav-a.nav-a-2.a-popover-trigger.a-declarative');
	if (d_button) {
		await d_button.click();
		await page.waitFor(1000);

		// Set Zip code location.
		const inputLocation = await page.$('#GLUXZipUpdateInput');
		await page.evaluate(
			(el, zip_code) => {
				el.value = zip_code;
			},
			inputLocation,
			zip_code
		);

		await page.waitFor(500); // wait for ajax loaded

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
	}

	await page.waitFor(2000); // do nothing just stop for test
	// ------END  ZIP code -------

	// 90213 Zip code ship to

	// main date filter ID: 15196852011
	// Đang check ở check_number trỏ xuống.
	const save_db = true;
	const check_number = 1565917200 
	// Stop at: 15196851742 - can check từ khoảng này đến 1565773800
	// New Start at: 1565773800
	// Stop at: 1565773696

	let number_to_check = 5000;
	let ci = 1;
	let check_delay = 30; // each 30 check page will delay
	let cd = 0;

	while (ci <= number_to_check) {
		let qid = Math.round(+new Date() / 1000);
		let date_abs = check_number + ci;
		let link = link_url.replace(/{{qid}}/gi, qid);
		link = link.replace(/{{date_abs}}/gi, date_abs);

		console.log('Check Link: ', link);
		await page.goto(link);
		ci++;
		cd++;

		if (cd >= check_delay) {
			cd = 0;

			console.log(colors.yellow('Delay for robot check -----------'));
			await page.waitFor(13000);
		}

		try {
			let titleHandle = await page.$('title');

			// pass the single handle below
			const text = await page.evaluate((el) => el.innerText, titleHandle);
			if ('Robot Check' == text) {
				console.log(colors.red('Robot check: ' + date_abs));
				ci = 0;
				await page.waitForNavigation();

				// ------ ZIP code -------
				const d_button = await page.$('.nav-a.nav-a-2.a-popover-trigger.a-declarative');
				if (d_button) {
					await d_button.click();
					await page.waitFor(1000);

					// Set Zip code location.
					const inputLocation = await page.$('#GLUXZipUpdateInput');
					await page.evaluate(
						(el, zip_code) => {
							el.value = zip_code;
						},
						inputLocation,
						zip_code
					);

					await page.waitFor(500); // wait for ajax loaded

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
				}

				await page.waitFor(13000); // do nothing just stop for test
				// ------END  ZIP code -------
				//return;
			}

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

			if (products.length) {
				console.log(colors.green('Found: ' + products.length + ' -- Link added: ' + link));

				// Save Link to Db
				if (save_db) {
					CatLink.findOrCreate(
						{
							date_id: date_abs
						},
						{
							title: text,
							products: products.length,
							link: link
						},
						function(err, p) {
							// your code here
							if (!err) {
								console.log(colors.green('Saved: ' + date_abs ) );
							} else {
								console.log(colors.red('Inser link error: ', err));
							}
						}
					);
				}
			} else {
				console.log(colors.grey('No products found'));
			}

			if (!text.indexOf(date_abs.toString())) {
				console.log(colors.green('Title change: ' + date_abs));
			} else {
				console.log(colors.grey('Title not change: ' + text));
			}
		} catch (e) {
			console.log('Title not found!');
		}

		// do whatever you want with the data

		await page.waitFor(1200);
	}

	browser.close();

	// Product.inserList( products );
} catch (error) {
	console.log('Catch : ' + error);
}