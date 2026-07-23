let currentUser = null;

// Tab Switch Functionality
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// Global View Switcher
function showView(viewId) {
    const authView = document.getElementById('auth-view');
    const crmView = document.getElementById('crm-view');

    if (viewId === 'crm-view') {
        if (authView) authView.classList.add('hidden');
        if (crmView) crmView.classList.remove('hidden');
    } else {
        if (crmView) crmView.classList.add('hidden');
        if (authView) authView.classList.remove('hidden');
    }
}

// Page Load Setup
window.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// LOGIN HANDLER - Fixed Field Selectors
async function handleLogin(e) {
    e.preventDefault();

    // Check all possible ID variations for username & password
    const userInput = document.getElementById('username') || document.getElementById('loginUser') || document.querySelector('input[type="text"]');
    const passInput = document.getElementById('password') || document.getElementById('loginPassword') || document.querySelector('input[type="password"]');

    if (!userInput || !passInput) {
        alert("Input fields missing in HTML!");
        return;
    }

    const username = userInput.value.trim();
    const password = passInput.value.trim();

    if (!username || !password) {
        alert("Kripya User ID aur Password dono bharein!");
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data;
            showView('crm-view');
            loadCRMData();
        } else {
            alert(data.message || 'Galat User ID ya Password!');
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Server se connect nahi ho pa raha hai.');
    }
}

// Load CRM Data
async function loadCRMData() {
    try {
        const res = await fetch('/api/crm-data');
        const data = await res.json();
        if (!data.success) return;

        // Populate Tables if elements exist
        const filesTable = document.getElementById('files-table');
        if (filesTable && data.applications) {
            filesTable.innerHTML = data.applications.map(app => `
                <tr>
                    <td>${app.id || 'N/A'}</td>
                    <td>${app.fullName || app.name || 'N/A'}</td>
                    <td>${app.mobile || 'N/A'}</td>
                    <td>${app.city || 'N/A'}</td>
                    <td>${app.pan || 'N/A'}</td>
                    <td><b>${app.status || 'Pending'}</b></td>
                </tr>
            `).join('');
        }

        const leadsTable = document.getElementById('leads-table');
        if (leadsTable && data.leads) {
            leadsTable.innerHTML = data.leads.map(lead => `
                <tr>
                    <td>${lead.name}</td>
                    <td>${lead.phone}</td>
                    <td>${lead.city || 'N/A'}</td>
                    <td>${lead.status || 'New'}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error loading CRM data:', err);
    }
}

function logout() {
    location.reload();
}