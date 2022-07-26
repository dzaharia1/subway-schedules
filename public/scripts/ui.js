let stopSelector;
let arrivalItems;
let stationSelectorItems;
let stationSelector;
let stationSearch;
let stationsSubmit;
let selectionIndicator;
let stationName;

var readyFunction = function() {
	stopSelector = document.querySelector('#stop-selector');
	arrivalItems = document.querySelectorAll('.arrival');
	stationSelector = document.querySelector('.station-selector__list');
	stationSelectorItems = document.querySelectorAll('.station-selector__station');
	stationSearch = document.querySelector('.station-selector__search-input');
	stationName = stationSearch.placeholder;
	stationsSubmit = document.querySelector('.station-selector__submit');
	selectionIndicator = document.querySelector('.station-selector__selection-indicator');

	for (let station of stationSelectorItems) {
		station.parentNode.removeChild(station);
		let stopid = station.getAttribute(`data-stopid`);
		let checkbox = station.querySelector('input');
		
		station.addEventListener('click', (e) => {
			let checkbox = station.querySelector('input[type="checkbox"]');
			if (checkbox.checked) {
				checkbox.checked = false;
				let indicator = selectionIndicator.querySelector(`[data-stopid="${stopid}"]`);
				indicator.parentNode.removeChild(indicator);
				stationsSubmit.href.replace(`/${stopid}`, '');
			} else {
				setSelectedStationIndicator(station);
				stationsSubmit.href += `/${stopid}`;
				checkbox.checked = true;
			}
		});
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

	stationSearch.addEventListener('blur', (e) => {
		if (stationSearch.value === '') {
			stationSearch.placeholder = stationName;
			stationSearch.value = '';
		}
	});

	stationSearch.addEventListener('input', (e) => {
		let searchTerm = stationSearch.value.toLowerCase();
		stationSelector.innerHTML = '';

		for (let station of stationSelectorItems) {
			let stationName = station.getAttribute('data-name').toLowerCase();
			if (stationName.indexOf(searchTerm) > -1) {
				stationSelector.appendChild(station);
			}
		}

		if (stationSelector.innerHTML != '' || selectionIndicator.innerHTML != '') {
			stationSelector.parentNode.style.display = 'flex';
		} else {
			stationSelector.parentNode.style.display = 'none';
		}
	});
}

function setSelectedStationIndicator(station) {
	let newNode = document.createElement('button');
	let name = station.getAttribute('data-name');
	let stopid = station.getAttribute('data-stopid');
	let lines = station.querySelectorAll('.station-selector__station-line');
	newNode.classList.add('station-selector__selection-indicator-item')

	newNode.setAttribute('data-name', name);
	newNode.setAttribute('data-stopid', stopid);
	newNode.innerHTML = `<p>${name}</p>`;
	for (let line of lines) {
		newNode.innerHTML += `<span line="${line.innerText}">${line.innerText}</span>`
	}

	newNode.addEventListener('click', (e) => {
		let stationSelectorItem = getStationItem(stopid);
		stationSelectorItem.querySelector('input').checked = false;
		newNode.parentNode.removeChild(newNode);
	});

	selectionIndicator.appendChild(newNode);
}

function getStationItem(stopid) {
	for (let item of stationSelectorItems) {
		if (item.getAttribute('data-stopid') === stopid) {
			return item;
		}
	}
}

if (document.readyState != 'loading') {
	readyFunction();
}
else {
	document.addEventListener('DOMContentLoaded', readyFunction)
}