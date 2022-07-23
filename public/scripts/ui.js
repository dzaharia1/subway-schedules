let stopSelector;
let arrivalItems;

var readyFunction = function() {
	stopSelector = document.querySelector('#stop-selector');
	arrivalItems = document.querySelectorAll('li');

	stopSelector.addEventListener('change', (e) => {
		console.log(stopSelector.value);
		console.log(window.location);
		window.location.href = `/web/${stopSelector.value}`;
	});

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