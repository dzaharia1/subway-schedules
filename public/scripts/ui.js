let activeStationsList;
let activeStations = [];
let searchResultsList;
let searchResults = [];
let searchInput;
let tabButtons;
let searchSubmitButton;
let checkboxExpanders;
let optionsSubmit;
let signInfo;

let readyFunction = function() {
	activeStationsList = document.querySelector('.active-stations');
	activeStations = activeStationsList.querySelectorAll('.stations-list__item');
	searchResultsList = document.querySelector('.search-results>.stations-list');
	searchResults = searchResultsList.querySelectorAll('.stations-list__item');
	searchInput = document.querySelector('.search-bar>input[type="text"]');
	searchSubmitButton = document.querySelector('.search-bar__save');
	tabButtons = document.querySelectorAll('.tabs>button');
	checkboxExpanders = document.querySelectorAll('.checkbox-expander');
	optionsSubmit = document.querySelector('.options__submit');

	signInfo = getSignInfo();

	for (let button of document.querySelectorAll('.stations-list__item')) {
		button.addEventListener('click', (e) => {
			if (checkMode()) {
				let stopId = button.getAttribute('stop-id');
				toggleStation(stopId);
			}
		});
	}

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
		searchInput.setAttribute('placeholder', 'Search stations');
		toggleEditStationswMode(true);
	});

	searchSubmitButton.addEventListener('click', async (e) => {
		toggleEditStationswMode(false);
		let signId = document.querySelector('.header__sign-name').getAttribute('sign-id');
		let url = `setstops/${signId}?stops=`;
		let trackedStations = getTrackedStations();
		for (let station of trackedStations) {
			url += `${station},`;
		}
		url = url.substr(0, url.length - 1);

		let returnData = await APIRequest('PUT', url);
		setTimeout(() => {
			window.location.reload();
		}, 400);
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

	for (let checkboxExpander of checkboxExpanders) {
		let checkbox = checkboxExpander.querySelector('input[type="checkbox"]');
		checkbox.addEventListener('change', (e) => {
			let activeString = 'checkbox-expander--active';
			if (checkbox.checked) {
				checkboxExpander.classList.add(activeString);
			} else {
				checkboxExpander.classList.remove(activeString);
			}
		});
	}

	optionsSubmit.addEventListener('click', () => {
		optionsSubmit.classList.add('options__submit--saving');
		optionsSubmit.innerText = "Saving..."

		setSignInfo(() => {
			optionsSubmit.classList.remove('options__submit--saving');
			optionsSubmit.classList.add('options__submit--saved');
			optionsSubmit.innerText = "Saved"
			setTimeout(() => {
				optionsSubmit.classList.remove('options__submit--saved');
				optionsSubmit.innerHTML = `
					<img src="../img/check.svg" alt="">
					Save`;
			}, 2500);
		});
	});
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

			searchResultsList.appendChild(station);
		}
	}
}

function toggleEditStationswMode(explicitSetting) {
	let main = document.querySelector('main');
	let modeString = `add-stations-mode`;

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

function toggleStation(stopId) {
	let activeStationButton;
	let searchResultButton;
	let activeString = 'stations-list__item--active';

	for (item of activeStations) {
		if (item.getAttribute('stop-id') === stopId) { activeStationButton = item; }
	}
	
	for (item of searchResults) {
		if (item.getAttribute('stop-id') === stopId) { searchResultButton = item; }
	}

	if (activeStationButton.classList.contains(activeString)) {
		activeStationButton.classList.remove(activeString);
		searchResultButton.classList.remove(activeString);
		activeStationsList.removeChild(activeStationButton);
		
	} else {
		activeStationButton.classList.add(activeString);
		searchResultButton.classList.add(activeString);
		activeStationsList.appendChild(activeStationButton);
	}
}

function getTrackedStations() {
	let stopIds = [];
	for (item of document.querySelectorAll(`.stations-list__item--active`)) {
		let stopId = item.getAttribute('stop-id');
		if (stopIds.indexOf(stopId) == -1) {
			stopIds.push(stopId);
		}
	}

	return stopIds;
}

function checkMode() {
	let main = document.querySelector('main');

	return main.classList.contains('add-stations-mode');
}

function clearSearchResults() {
	searchResultsList.innerHTML = '';
}

async function getSignInfo() {
	let signId = document.querySelector('.header__sign-name').getAttribute('sign-id');
	let signInfo = await APIRequest('GET', `signinfo/${signId}`);
	return signInfo;
}

async function setSignInfo(callback) {
	let signDirection = '';
	if (document.querySelector('[name="show-direction"]').checked) {
		signDirection = document.querySelector('[name="direction"]:checked').value;
	}
	let signRotation = document.querySelector('[name="rotation"]').checked;
	let numArrivals = document.querySelector('#num-arrivals').value;
	let cycleTime = document.querySelector('#cycle-time').value;
	let autoOff = document.querySelector('#auto-off-select').checked;
	let autoOffStart = document.querySelector('#auto-off-start').value;
	let autoOffEnd = document.querySelector('#auto-off-end').value;

	let signId = document.querySelector('.header__sign-name').getAttribute('sign-id');
	let url = `signinfo/${signId}?signDirection=${signDirection}&signRotation=${signRotation}&numArrivals=${numArrivals}&cycleTime=${cycleTime}&autoOff=${autoOff}&autoOffStart=${autoOffStart}&autoOffEnd=${autoOffEnd}`;
	let returnData = await APIRequest('PUT', url);
	
	callback();

}

if (document.readyState != 'loading') {
	readyFunction();
}
else {
	document.addEventListener('DOMContentLoaded', readyFunction)
}