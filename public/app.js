async function handleLogin(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (!name || !pass) {
        alert('Kripya Username aur Password bharo!');
        return;
    }

    // EMERGENCY BYPASS FOR INSTANT LOGIN
    if (name.toLowerCase() === 'admin' && pass === 'admin') {
        currentUser = 'Admin User';
        currentRole = 'ADMIN';
        localStorage.setItem('dsa_user', JSON.stringify({ name: currentUser, role: currentRole }));
        showDashboard();
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, pass })
        });
        const data = await res.json();
        
        if (data.success) {
            currentUser = data.user.name;
            currentRole = data.user.role;
            localStorage.setItem('dsa_user', JSON.stringify(data.user));
            showDashboard();
        } else {
            alert(data.message || 'Login Failed!');
        }
    } catch (err) {
        // Fallback agar server request fail ho jaye
        currentUser = name;
        currentRole = 'STAFF';
        localStorage.setItem('dsa_user', JSON.stringify({ name: currentUser, role: currentRole }));
        showDashboard();
    }
}