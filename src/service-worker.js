/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
const APP_NAME = process.env.REACT_APP_NAME
const CACHE =`${APP_NAME}-${process.env.REACT_APP_SW_VERSION}`
clientsClaim();

// Precache all of the assets generated by your build process.
// Their URLs are injected into the manifest variable below.
// This variable must be present somewhere in your service worker file,
// even if you decide not to use precaching. See https://cra.link/PWA
precacheAndRoute(self.__WB_MANIFEST);


registerRoute(
	new RegExp('/*'),
	new CacheFirst({
		cacheName: CACHE
	})
);

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

self.addEventListener('activate', (evt) => {
	console.log('[ServiceWorker] Activate');
	//Remove previous cached data from disk.
	evt.waitUntil(
		caches.keys().then(async (keyList) => {
			const promises = await Promise.all(keyList.map((key) => {
				if ((key.includes(APP_NAME) && key !== CACHE)) {
					console.log('[ServiceWorker] Removing old cache', key);
					return caches.delete(key)
				}
				return new Promise(resolve => resolve())
			}));
			return promises
		})
	);
	self.clients.claim();
});

