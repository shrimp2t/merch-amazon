const config = {
	startDate: 1565917200,
	numberToCheck: 50000,
	checkDelay: 25,
	numberBrowser: 2,
	zipCode: '90213',
	saveDb: true,
	headless: false,
	mysql: {
		host: '163.44.192.136',
		port: '3306',
		username: 'shrimp2t',
		password: 'venudemilo1',
		database: 'merch-mazon'
	},
	blockedResourceTypes: [ 'image', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset' ],
	skippedResources: [
		'quantserve',
		'adzerk',
		'doubleclick',
		'adition',
		'exelator',
		'sharethrough',
		'cdn.api.twitter',
		'google-analytics', 
		'googletagmanager',
		'google',
		'fontawesome',
		'facebook',
		'analytics',
		'optimizely',
		'clicktale',
		'mixpanel',
		'zedo',
		'clicksor',
		'tiqcdn'
	],
	linkFormat:
		'https://www.amazon.com/s?i=fashion&bbn=7141124011&rh=n%3A7141123011%2Cn%3A%217141124011%2Cn%3A7147445011%2Cp_n_date_first_available_absolute%3A{{date_abs}}%2Cp_6%3AATVPDKIKX0DER&s=date-desc-rank&dc&qid={{qid}}'
};

module.exports = config;
