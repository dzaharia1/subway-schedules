let stopSelector;
let arrivalItems;

var readyFunction = function() {
	stopSelector = document.querySelector('#stop-selector');
	arrivalItems = document.querySelectorAll('li');

	stopSelector.addEventListener('change', (e) => {
		window.location.href += `schedule/${stopSelector.value}`;
	});

	for (arrival of arrivalItems) {
		let time = arrival.querySelector('p:last-child');
		if (time.innertext == '0min') {
			arrival.classlist.add('warn');
		}
	}
}

if (document.readyState != 'loading') {
	readyFunction();
}
else {
	document.addEventListener('DOMContentLoaded', readyFunction)
}