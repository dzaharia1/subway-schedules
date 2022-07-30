let stopSelector;
let arrivalItems;
let stationSelectorItems;
let stationSelector;
let stationSearch;
let submitButton;
let selectionIndicator;
let stationName;
let trackedStations = [];

let readyFunction = function() {
	stopSelector = document.querySelector('#stop-selector');
	arrivalItems = document.querySelectorAll('.arrival');
	stationSelector = document.querySelector('.station-selector__list');
	stationSelectorItems = document.querySelectorAll('.station-selector__station');
	stationSearch = document.querySelector('.station-selector__search-input');
	stationName = stationSearch.placeholder;
	submitButton = document.querySelector('.submit');
	selectionIndicator = document.querySelector('.station-selector__selection-indicator');

	for (let stationSelectorItem of stationSelectorItems) {
		stationSelector.removeChild(stationSelectorItem);
		const checkbox = stationSelectorItem.querySelector('input');
		
		checkbox.addEventListener('change', () => {
			const stopid = stationSelectorItem.getAttribute(`id`);
			const indicator = document.querySelector(`button[id="${stopid}"]`);

			if (!checkbox.checked) {
				indicator.classList.remove('station-selector__selection-indicator-item--active');
				trackedStations.splice(trackedStations.indexOf(stopid), 1);
			} else {
				indicator.classList.add('station-selector__selection-indicator-item--active');
				trackedStations.push(stopid);
			}
			stationSelector.parentNode.style.top = `${selectionIndicator.getBoundingClientRect().bottom}px`;
			console.log(trackedStations);
		});
	}

	for (let indicator of selectionIndicator.querySelectorAll('button')) {
		if (indicator.classList.contains("station-selector__selection-indicator-item--active")) {
			trackedStations.push(indicator.id);
		}

		indicator.addEventListener('click', () => {
			let stationCheckbox = getStationCheckbox(indicator.id);
			console.log(stationCheckbox);
			stationCheckbox.checked = false;
			indicator.classList.remove('station-selector__selection-indicator-item--active');
			trackedStations.splice(trackedStations.indexOf(indicator.id), 1);
			stationSelector.parentNode.style.top = `${selectionIndicator.getBoundingClientRect().bottom}px`;
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
		stationSelector.parentNode.style.top = `${selectionIndicator.getBoundingClientRect().bottom}px`;

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

	submitButton.addEventListener('click', (e) => {
		let href = `/web?stops=`;
		for (let station of trackedStations) {
			href += `${station},`;
		}

		window.location.href = href.substring(0, href.length - 1);
	});
}

function getStationCheckbox(stopid) {
	for (let station of stationSelectorItems) {
		if (station.id === stopid) {
			return station.querySelector('input');
		}
	}
}

function setSelectedStationIndicator(station) {
	let indicator = document.createElement('button');
	let name = station.getAttribute('data-name');
	let stopid = station.getAttribute('data-stopid');
	let lines = station.querySelectorAll('.station-selector__station-line');
	indicator.classList.add('station-selector__selection-indicator-item')

	indicator.setAttribute('data-name', name);
	indicator.setAttribute('data-stopid', stopid);
	indicator.innerHTML = `<p>${name}</p>`;
	for (let line of lines) {
		indicator.innerHTML += `<span line="${line.innerText}">${line.innerText}</span>`
	}

	indicator.addEventListener('click', (e) => {
		let stationSelectorItem = getStationSelectorItem(stopid);
		stationSelectorItem.querySelector('input').checked = false;
		indicator.parentNode.removeChild(indicator);
	});

	selectionIndicator.appendChild(indicator);
}

if (document.readyState != 'loading') {
	readyFunction();
}
else {
	document.addEventListener('DOMContentLoaded', readyFunction)
}