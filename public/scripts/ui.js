let stopSelector;
let arrivalItems;

var readyFunction = function() {
	stopSelector = document.querySelector('#stop-selector');
	arrivalItems = document.querySelectorAll('li');

	// stopSelector.addEventListener('change', (e) => {
	// 	window.location.href += `schedule/${stopSelector.value}`;
	// });

	for (arrival of arrivalItems) {
		let time = arrival.querySelector('p:last-child');
		if (time.innerText == '0 min') {
			console.log('oh boy');
			time.classList.add('warn');
		}
	}
}

if (document.readyState != 'loading') {
	readyFunction();
}
else {
	document.addEventListener('DOMContentLoaded', readyFunction)
}