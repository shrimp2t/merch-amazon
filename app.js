// const express = require('express');
// const util = require('util');
// const bodyParser = require('body-parser');
// const mysql = require('mysql');
// const path = require('path');

const config = require('./config');
const Browser = require('./actions/browser');
const { Proxy, Flag } = require('./models/models');
var dateFormat = require('dateformat');
//const unixDateNow = Math.round(+new Date( '' ) / 1000);
today = dateFormat(+new Date(), 'yyyy-mm-dd 00:00:00');
const unixDateNow = Math.round(+new Date(today) / 1000);

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;


if (cluster.isMaster) {
	console.log(`Master ${process.pid} is running`);
  
	// Fork workers.
	for (let i = 0; i < numCPUs; i++) {
	  cluster.fork();
	}
  
	cluster.on('exit', (worker, code, signal) => {
	  console.log(`worker ${worker.process.pid} died`);
	});
  } else {
	(async () => {
		let b = new Browser();
		// console.log('listProxies: ', listProxies);
		console.log('UNIX Date Now: ', unixDateNow);
		b.setTodayUnix(unixDateNow);
		b.add();
		//b.add();
		b.on('browser_closed', function() {
			if ( b.count() < 2 ) {
				b.add();
				//b.add();
			}
		});
	})();
  }


