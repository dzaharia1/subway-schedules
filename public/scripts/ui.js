let stopSelector;
let arrivalItems;
let stationSelectorItems;
let stationSelector;
let stationSearch;
let stationPreview;
let selectionIndicator;
let stationName;
let setSignStationsButton;
let trackedStations = [];

let readyFunction = function() {
	stopSelector = document.querySelector('#stop-selector');
	arrivalItems = document.querySelectorAll('.arrival');
	stationSelector = document.querySelector('.station-selector__list');
	stationSelectorItems = document.querySelectorAll('.station-selector__station');
	stationSearch = document.querySelector('.station-selector__search-input');
	stationName = stationSearch.placeholder;
	stationPreview = document.querySelector('.station-selector__submit');
	selectionIndicator = document.querySelector('.station-selector__selection-indicator');

	for (let stationSelector of stationSelectorItems) {
		stationSelector.parentNode.removeChild(stationSelector);
		let stopid = station.getAttribute(`data-stopid`);
		let checkbox = station.querySelector('input');
		
		stationSelector.addEventListener('click', (e) => {
			let checkbox = stationSelector.querySelector('input[type="checkbox"]');
			if (checkbox.checked) {
				checkbox.checked = false;
				let indicator = selectionIndicator.querySelector(`[data-stopid="${stopid}"]`);
				indicator.parentNode.removeChild(indicator);
				console.log(`removing ${stopid},`);
				let newUrl = stationPreview.href;
				newUrl.replace(`${stopid},`, '');
				stationSelector.parentNode.style.top = `${selectionIndicator.getBoundingClientRect().bottom}px`;
				stationPreview.href = newUrl;
			} else {
				setSelectedStationIndicator(stationSelector);
				stationPreview.href += `${stopid},`;
				checkbox.checked = true;
				stationSelector.parentNode.style.top = `${selectionIndicator.getBoundingClientRect().bottom}px`;
				console.log(selectionIndicator.getBoundingClientRect().bottom);
			}
		});
	}

	for (let indicator of selectionIndicator.querySelectorAll('button')) {
		trackedStations.push(indicator.getAttribute('data-stopid'));

		indicator.addEventListener('click', () => {
			let stopid = indicator.getAttribute(`data-stopid`);
			let stationSelectorItem = getStationSelectorItem(stopid);
			stationSelectorItem.querySelector('input').checked = false;
			indicator.parentNode.removeChild(indicator);
			stationPreview.href.replace(`${stopid},`, '');
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

	stationPreview.addEventListener('click', (e) => {
		// stationPreview.href = stationPreview.href.subString(0, stationPreview.href.length - 1);
		e.preventDefault();
		window.location.href = stationPreview.href.substring(0, stationPreview.href.length - 1);
	});
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

function getStationSelectorItem(stopid) {
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