let activeStationsList;
let activeStations = [];
let searchResultsList;
let searchResults = [];
let searchInput;
// let editStationsButton;
let tabButtons;
let searchSubmitButton;

let readyFunction = function() {
	activeStationsList = document.querySelector('.active-stations');
	activeStations = activeStationsList.querySelectorAll('.stations-list__item');
	searchResultsList = document.querySelector('.search-results>.stations-list');
	searchResults = searchResultsList.querySelectorAll('.stations-list__item');
	searchInput = document.querySelector('.search-bar>input[type="text"]');
	searchSubmitButton = document.querySelector('.search-bar__save');
	// editStationsButton = document.querySelector('.edit-stations');
	tabButtons = document.querySelectorAll('.tabs>button');

	for (let activeStation of activeStations) {
		if (!activeStation.classList.contains('stations-list__item--active')) {
			activeStation.parentNode.removeChild(activeStation);
		}
	}
	clearSearchResults();

	searchInput.addEventListener('input', (e) => {
		let searchTerm = searchInput.value;
		searchStations(searchTerm);
	});

	searchInput.addEventListener('focus', (e) => {
		toggleStationsViewMode(true);
	});

	searchSubmitButton.addEventListener('click', (e) => {
		toggleStationsViewMode(false);
	});

	for (let tabButton of tabButtons) {
		tabButton.addEventListener ('click', (e) => {
			let targetClassname = `tab-panel__frame--${tabButton.getAttribute('target-frame')}`;
			let leftClassname = `tab-panel__frame--left`;
			let rightClassname = `tab-panel__frame--right`;
			let tabFrame = document.querySelector('.tab-panel__frame');
			tabFrame.classList.remove(leftClassname);
			tabFrame.classList.remove(rightClassname);
			tabFrame.classList.add(targetClassname);

			for (let button of tabButtons){
				button.classList.remove('tabs__item--active');
			}

			tabButton.classList.add('tabs__item--active');
		});
	}
}

function searchStations(searchTerm) {
	searchTerm = searchTerm.toLowerCase();
	clearSearchResults();

	for (let station of searchResults) {
		let stopName = station.querySelector('h3').innerText.toLowerCase();
		if (stopName.includes(searchTerm)) {
			let stopId = station.getAttribute('stop-id');
			let correspondingActiveItem;
			for (let station of activeStations) {
				if (station.getAttribute('stop-id') === stopId) {
					correspondingActiveItem = station;
				}
			}
			if (correspondingActiveItem.parentNode !== activeStationsList) {
				searchResultsList.appendChild(station);
			}
		}
	}
}

function toggleStationsViewMode(explicitSetting) {
	let main = document.querySelector('main');
	let modeString = `add-stations-mode`;
	// let buttonImage = editStationsButton.querySelector('img');

	if (!explicitSetting) {
		main.classList.remove(modeString);
		searchInput.value = '';
		setTimeout(() => {
			clearSearchResults();
		}, 1000);
	} else {
		main.classList.add(modeString);
		searchInput.focus();
	}
}

function clearSearchResults() {
	searchResultsList.innerHTML = '';
}

if (document.readyState != 'loading') {
	readyFunction();
}
else {
	document.addEventListener('DOMContentLoaded', readyFunction)
}