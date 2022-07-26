let stopSelector;
let arrivalItems;
let stationSelectorItems;
let stationSelector;
let stationSearch;

var readyFunction = function() {
	stopSelector = document.querySelector('#stop-selector');
	arrivalItems = document.querySelectorAll('.arrival');
	stationSelector = document.querySelector('.station-selector');
	stationSelectorItems = document.querySelectorAll('.station-selector__station');
	stationSearch = document.querySelector('.station-selector__search-input');

	for (let station of stationSelectorItems) {
		station.parentNode.removeChild(station);
	}

	for (arrival of arrivalItems) {
		let time = arrival.querySelector('p:last-child');
		if (time.innerText == '0 min') {
			console.log('oh boy');
			time.classList.add('warn');
		}
	}

	stationSearch.addEventListener('focus', (e) => {
		stationSearch.placeholder = '';
	});

	stationSearch.addEventListener('input', (e) => {
		let searchTerm = stationSearch.value.toLowerCase();
		stationSelector.innerHTML = '';
		console.log(`Searching for ${searchTerm}`);
		for (let station of stationSelectorItems) {
			let stationName = station.getAttribute('data-name').toLowerCase();
			if (stationName.indexOf(searchTerm) > -1) {
				console.log(stationName);
				stationSelector.appendChild(station);
			}
		}

		if (stationSelector.innerHTML != '') {
			stationSelector.style.display = 'flex';
		} else {
			stationSelector.style.display = 'none';
		}
	});
}

if (document.readyState != 'loading') {
	readyFunction();
}
else {
	document.addEventListener('DOMContentLoaded', readyFunction)
}