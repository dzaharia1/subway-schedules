let signCodeInput;
let goButton;

let readyFunction = () => {
    signCodeInput = document.querySelector('#sign-code');
    goButton = document.querySelector('.go-button')

    signCodeInput.addEventListener('input', () => {
        let errorText = signCodeInput.parentNode.querySelector('.input__error');
        signCodeInput.value = signCodeInput.value.toLowerCase();
        let validation = inputValidator(signCodeInput.value);
        
        signCodeInput.parentNode.classList.remove('input--error');
        signCodeInput.parentNode.classList.remove('input--valid');

        if (signCodeInput.value != '' && validation.error) {
            signCodeInput.parentNode.classList.add('input--error');
            errorText.innerText = validation.errorText;
        } else if (!validation.error) {
            signCodeInput.parentNode.classList.add('input--valid');
            errorText.innerText = 'This sign code is valid';
        }
    });

    signCodeInput.addEventListener('keypress', (e) => {
        if (e.key == 'Enter') {
            submit();
        }
    });

    goButton.addEventListener('click', async () => {
        submit();
    });
}

async function submit() {
    if (await checkSignCode()) {
        goButton.classList.add('button--valid');
        goButton.innerText = 'Sign found!'
        setTimeout(() => {
            window.location.href = `/web/${signCodeInput.value}`;
        }, 1000);
    } else {
        let inputContainer = signCodeInput.parentNode;
        goButton.classList.add('button--error');
        goButton.innerText = 'Error'
        inputContainer.classList.remove('input--valid');
        inputContainer.classList.add('input--error');
        inputContainer.querySelector('.input__error').innerText = `There is no sign with this code`;

        setTimeout(() => {
            goButton.classList.remove('button--error');
            goButton.innerText = 'Find my sign';
        }, 2000);
    }
}

function inputValidator (input) {
    if (input.length != 4) {
        return {
            error: true,
            errorText: 'The sign code must be 4 characters long'
        }
    }

    if (!/^[a-zA-Z]+$/.test(input)) {
        return {
            error: true,
            errorText: 'The sign code must only contain letters'
        }
    }
    
    return {
        error: false,
        errorText: ''
    }
}

async function checkSignCode() {
    let signId = signCodeInput.value;
    let url = `signinfo/${signId}`;
    let returnData = await APIRequest('GET', url);
    if (!returnData.error) {
        return true;
    } else {
        return false;
    }
}

if (document.readyState != 'loading') {
    readyFunction();
} else {
	document.addEventListener('DOMContentLoaded', readyFunction);   
}