document.getElementById('login-form').onsubmit = async function(event) {
    event.preventDefault();
    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        })
    });
    const result = await response.json();
    const messageElement = document.getElementById('message');
    if (result.success) {
        window.location.href = '/';
    } else {
        messageElement.textContent = result.message;
    }
}