const { Proxy } = require('./models');

async function getProxies() { 
	return Proxy.getList();
}

module.exports = { getProxies };