self.importScripts('/sw/cached-urls.js');

var is_online = navigator.onLine;
var allowed_domain = "https://edit.cartoonize.net";
var CACHE_NAME = 'cartoonize-cache-1';

self.addEventListener('install', function(event) {
    event.waitUntil(self.skipWaiting()); // Activate worker immediately
});
self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim()); // Become available to all pages
});

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

addEventListener('message', async (event) => {
	switch(event.data.MSG_ID){
		case 'INSTALL_ADDITIONAL':
			event.source.postMessage({
				MSG_ID: "install_aditional", 
				urls: urlsToCache_additional, 
				cache: CACHE_NAME, 
				total_links_for_cache: urlsToCache_additional.length
			});			
		break;
	
		case 'CURRENT_STATE':
			console.log("event.data", event.data);;
			if(event.data.STATE=='installed'){
				if(event.data.cache_exist){
					event.source.postMessage({MSG_ID: "installed", "dbg": "app already installed"});
				}else{
					var cache = await caches.open(CACHE_NAME);
				
					event.source.postMessage({MSG_ID: "before_install"});
				
					event.source.postMessage({MSG_ID: "installing"});
					event.source.postMessage({MSG_ID: "add_to_cache_all", urls: urlsToCache, cache: CACHE_NAME, total_links_for_cache: urlsToCache.length});
					return;

				}
			}
		break;
	}
});



self.addEventListener('install', async function(event) {
	
	var cache = await caches.open(CACHE_NAME);
	var urlsToPrefetch = [
		'/',
		'/image-manager',
		'/assets/warning.8f0c908f.svg',
		'/sw/cached-urls.js'
	];
	// await cache.addAll(urlsToPrefetch);

	await cache.addAll(urlsToPrefetch.map(function(urlToPrefetch) {
		return new Request(urlToPrefetch, { mode: 'no-cors' });
	})).then(function() {
		console.log('All resources have been fetched and cached.');
	});
	console.log("=== URLS ADDED === 1");
});

self.addEventListener('activate', event=>{
});

let cache1 = false;




self.addEventListener('fetch', (e) => {
	e.respondWith((async () => {
		if(true){
			var isOnline = navigator.onLine;

			if(!cache1){
				cache1 = await caches.open(CACHE_NAME);
			}
			
			if(isOnline){
				const response = await fetch(e.request);
				cache1.put(e.request, response.clone());
				return response;
			}
			
			const r = await caches.match(e.request, {ignoreSearch: true});

			if(r){ 
				return r; 
			}
			
			const response = await fetch(e.request);
			return response;
		}
	})());
});

