// const express = require('express');
// const util = require('util');
// const bodyParser = require('body-parser');
// const mysql = require('mysql');
// const path = require('path');

const config = require('./config');
const Browser = require('./actions/browser');
const { Proxy, Flag } = require('./models/models');
var dateFormat = require('dateformat');
// const unixDateNow = Math.round(+new Date(  ) / 1000);
console.log( 'UTC TIME: ',  Math.round( new Date().getTime() / 1000 ) );

today = dateFormat(+new Date(), 'yyyy-mm-dd');
const unixDateNow = Math.round(+new Date(today) / 1000);
console.log( 'unixDateNow', unixDateNow );
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;


if (cluster.isMaster) {
	console.log(`Master ${process.pid} is running`);
  
	// Fork workers.
	for (let i = 0; i < 2; i++) { // numCPUs
	  cluster.fork();
	}
  
	cluster.on('exit', (worker, code, signal) => {
	  console.log(`worker ${worker.process.pid} died`);
	});
  } else {
	(async () => {
		const b = new Browser();
		// console.log('listProxies: ', listProxies);
		b.setTodayUnix(unixDateNow);
		b.add();
		b.on('browser_closed', function( browser ) {
			try {
				if ( browser.browsers.length  ) {
					for ( let i = 0; i< browser.browsers.length ; i++ ) {
						browser.browsers[i].close();
					}
				}
			} catch( e ) {

			}
			// console.log( 'browsers: ', browser.browsers.length );
			b.add();
		});
	})();
  }


