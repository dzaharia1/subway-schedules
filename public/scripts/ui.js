let activeStationsList;
let activeStations = [];
let searchResultsList;
let searchResults = [];
let searchInput;
let editStationsButton;
let tabButtons;

let readyFunction = function() {
	activeStationsList = document.querySelector('.active-stations');
	activeStations = activeStationsList.querySelectorAll('.stations-list__item');
	searchResultsList = document.querySelector('.search-results>.stations-list');
	searchResults = searchResultsList.querySelectorAll('.stations-list__item');
	searchInput = document.querySelector('.search-bar>input[type="text"]');
	editStationsButton = document.querySelector('.edit-stations');
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

	editStationsButton.addEventListener('click', (e) => {
		toggleStationsViewMode();
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

function toggleStationsViewMode() {
	let main = document.querySelector('main');
	let modeString = `add-stations-mode`;
	let buttonImage = editStationsButton.querySelector('img');

	if (main.classList.contains(modeString)) {
		main.classList.remove(modeString);
		buttonImage.setAttribute('src', '../img/search.svg');
		searchInput.value = '';
		editStationsButton.querySelector('p').innerText = "Edit stations";
		setTimeout(() => {
			clearSearchResults();
		}, 1000);
	} else {
		main.classList.add(modeString);
		editStationsButton.querySelector('p').innerText = "Save"
		buttonImage.setAttribute('src', '../img/check.svg');
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