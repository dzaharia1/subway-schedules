let activeStationsList = [];

let readyFunction = function() {
	activeStationsList = document.querySelectorAll('.active-stations__item');

	for (let activeStation of activeStationsList) {
		if (!activeStation.classList.contains('active-stations__item--active')) {
			activeStation.parentNode.removeChild(activeStation);
		}
	}
}

if (document.readyState != 'loading') {
	readyFunction();
}
else {
	document.addEventListener('DOMContentLoaded', readyFunction)
}