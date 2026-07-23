let currentUser = null;
let currentRole = null;
let socket = typeof io !== 'undefined' ? io() : null;

let allLeads = [];
let allSMs = [];
let allBanks = [];

// App Startup
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    if (socket) {
        socket.on('data_update', refreshData);
    }
});

function toggleAuth(view) {
    if (view === 'signup') {
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('signup-box').style.display = 'block';
    } else {
        document.getElementById('login-box').style.display = 'block';
        document.getElementById('signup-box').style.display = 'none';
    }
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (!name || !pass) {
        alert('Kripya Username aur Password bharo!');
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
        // Fallback for demo/offline testing
        if (name === 'admin' && pass === 'admin') {
            currentUser = 'Admin User';
            currentRole = 'ADMIN';
            localStorage.setItem('dsa_user', JSON.stringify({ name: currentUser, role: currentRole }));
            showDashboard();
        } else {
            alert('Server Error ya Network Issue. Backend check karein.');
        }
    }
}

function checkSession() {
    const saved = localStorage.getItem('dsa_user');
    if (saved) {
        const u = JSON.parse(saved);
        currentUser = u.name;
        currentRole = u.role;
        showDashboard();
    }
}

function logout() {
    localStorage.removeItem('dsa_user');
    currentUser = null;
    currentRole = null;
    document.getElementById('app-view').style.display = 'none';
    document.getElementById('auth-view').style.display = 'block';
}

function showDashboard() {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('app-view').style.display = 'block';
    document.getElementById('user-display').innerText = currentUser;
    
    const badge = document.getElementById('role-badge');
    badge.innerText = currentRole;
    badge.className = 'badge ' + (currentRole === 'ADMIN' ? 'badge-admin' : currentRole === 'STAFF' ? 'badge-staff' : 'badge-agent');
    
    if (currentRole === 'ADMIN') {
        document.getElementById('admin-tab-btn').style.display = 'inline-block';
    }
    
    refreshData();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');
}

async function refreshData() {
    try {
        const [leadsRes, smsRes, banksRes] = await Promise.all([
            fetch('/api/leads').then(r => r.json()).catch(() => []),
            fetch('/api/sms').then(r => r.json()).catch(() => []),
            fetch('/api/banks').then(r => r.json()).catch(() => [])
        ]);
        
        allLeads = leadsRes || [];
        allSMs = smsRes || [];
        allBanks = banksRes || [];
        
        updateKPIs();
        renderSMDirectory();
        renderCallingDesk();
        renderBankDropdowns();
        renderBankLinks();
        renderBankingOps();
    } catch (e) {
        console.log('Error refreshing data:', e);
    }
}

function updateKPIs() {
    document.getElementById('kpi-total-leads').innerText = allLeads.length;
    document.getElementById('kpi-in-process').innerText = allLeads.filter(l => l.status === 'Bank Login Submitted' || l.status === 'In-Process').length;
    document.getElementById('kpi-disbursed').innerText = allLeads.filter(l => l.status === 'Disbursed').length;
    
    const totalVol = allLeads.filter(l => l.status === 'Disbursed').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    document.getElementById('kpi-volume').innerText = '₹' + totalVol.toLocaleString('en-IN');
}

function renderSMDirectory() {
    const list = document.getElementById('sm-directory-list');
    list.innerHTML = '';
    
    const city = document.getElementById('sm-search-city').value.toLowerCase();
    const prod = document.getElementById('sm-search-product').value;
    const bank = document.getElementById('sm-search-bank').value;
    
    const filtered = allSMs.filter(s => {
        const mCity = !city || (s.city && s.city.toLowerCase().includes(city));
        const mProd = !prod || s.product === prod;
        const mBank = !bank || s.bank === bank;
        return mCity && mProd && mBank;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<p style="color:gray; grid-column: 1/-1;">Koi Sales Manager match nahi hua.</p>';
        return;
    }

    filtered.forEach(sm => {
        const div = document.createElement('div');
        div.className = 'sm-card';
        div.innerHTML = `
            <span class="sm-badge-product">${sm.product || 'General'}</span>
            <h4 style="color:#2b3674;">${sm.name}</h4>
            <p style="font-size:12px; color:#a3aed0;">🏦 ${sm.bank} - 📍 ${sm.city}</p>
            <p style="font-size:12px; margin-top:5px;">📞 ${sm.mobile} | ✉️ ${sm.email || 'N/A'}</p>
            <p style="font-size:11px; color:gray;">📍 ${sm.location || ''}</p>
            <a href="tel:${sm.mobile}" class="btn-call" style="margin-top:8px;">Call SM Direct</a>
        `;
        list.appendChild(div);
    });
}

function searchSalesManagers() {
    renderSMDirectory();
}

function renderCallingDesk() {
    const tbody = document.getElementById('calling-table-body');
    tbody.innerHTML = '';
    
    const q = document.getElementById('calling-search-input').value.toLowerCase();
    const filtered = allLeads.filter(l => !q || l.name.toLowerCase().includes(q) || l.mobile.includes(q) || (l.city && l.city.toLowerCase().includes(q)));

    filtered.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${l.leadId || 'LD-' + l.id}</b></td>
            <td>${l.name}</td>
            <td>${l.mobile}</td>
            <td>${l.city || 'N/A'}</td>
            <td><a href="tel:${l.mobile}" class="btn-call">📞 Call Now</a></td>
            <td><span class="badge badge-staff">${l.status}</span></td>
            <td>
                <select onchange="quickUpdateStatus('${l.id}', this.value)" style="margin:0; padding:4px;">
                    <option value="">Update Status...</option>
                    <option value="Interested / To Apply">Interested</option>
                    <option value="Documents Collected">Docs Collected</option>
                    <option value="Not Interested">Not Interested</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterCallingData() {
    renderCallingDesk();
}

async function quickUpdateStatus(id, newStatus) {
    if (!newStatus) return;
    await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    refreshData();
}

function renderBankDropdowns() {
    const smBankSel = document.getElementById('sm-search-bank');
    const appBankSel = document.getElementById('app-bank-select');
    
    smBankSel.innerHTML = '<option value="">-- All Banks --</option>';
    appBankSel.innerHTML = '<option value="">-- Select Bank --</option>';
    
    allBanks.forEach(b => {
        smBankSel.innerHTML += `<option value="${b.name}">${b.name}</option>`;
        appBankSel.innerHTML += `<option value="${b.name}">${b.name}</option>`;
    });
}

function triggerDynamicSMMatch() {
    const city = document.getElementById('app-city').value.trim().toLowerCase();
    const prod = document.getElementById('app-loan-type').value;
    const bank = document.getElementById('app-bank-select').value;
    
    const banner = document.getElementById('sm-matched-banner');
    const details = document.getElementById('sm-matched-details');

    if (!city || !bank) {
        banner.style.display = 'none';
        return;
    }

    const matched = allSMs.find(s => s.bank === bank && s.product === prod && s.city.toLowerCase() === city);

    if (matched) {
        banner.style.display = 'block';
        details.innerHTML = `<b>${matched.name}</b> (${matched.bank}) | 📞 ${matched.mobile} | ✉️ ${matched.email || 'N/A'} | Location: ${matched.location || 'Branch Office'}`;
    } else {
        banner.style.display = 'block';
        details.innerHTML = `<span style="color:red;">⚠️ Koi specific Sales Manager mapped nahi mila! Default Admin contact karein.</span>`;
    }
}

async function submitLoanApplication() {
    const name = document.getElementById('app-cust-name').value;
    const mobile = document.getElementById('app-mobile').value;
    const city = document.getElementById('app-city').value;
    const product = document.getElementById('app-loan-type').value;
    const amount = document.getElementById('app-amount').value;
    const bank = document.getElementById('app-bank-select').value;
    const status = document.getElementById('app-status').value;

    if (!name || !mobile || !city || !amount) {
        alert('Kripya saare Zaroori (*) fields bharein!');
        return;
    }

    const payload = {
        leadId: 'LD' + Math.floor(1000 + Math.random() * 9000),
        name, mobile, city, product, amount, bank, status
    };

    await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    alert('Customer Application successfully register ho gaya!');
    refreshData();
    switchTab('tab-calling');
}

function renderBankLinks() {
    const grid = document.getElementById('bank-links-grid');
    grid.innerHTML = '';
    
    allBanks.forEach(b => {
        grid.innerHTML += `
            <div class="card" style="margin-bottom:0;">
                <h4 style="color:#4318ff;">🏛️ ${b.name}</h4>
                <p style="font-size:12px;">ROI: <b>${b.roi || 'N/A'}</b> | Payout: <b>${b.payout || '0'}%</b></p>
                <div class="cred-box">
                    <strong>Portal ID:</strong> ${b.portalId || 'N/A'}<br>
                    <strong>Pass:</strong> ${b.portalPass || '*****'}
                </div>
                <a href="${b.link || '#'}" target="_blank" class="btn-partner">Direct Portal Open 🔗</a>
            </div>
        `;
    });
}

function renderBankingOps() {
    const tbody = document.getElementById('banking-table-body');
    tbody.innerHTML = '';

    allLeads.forEach(l => {
        tbody.innerHTML += `
            <tr>
                <td><b>${l.leadId || 'LD-' + l.id}</b></td>
                <td>${l.name}<br><small style="color:gray;">${l.city}</small></td>
                <td>${l.product}<br><b>₹${Number(l.amount || 0).toLocaleString('en-IN')}</b></td>
                <td>${l.bank || 'Unassigned'}</td>
                <td><span class="badge badge-staff">${l.status}</span></td>
                <td>
                    <button type="button" onclick="quickUpdateStatus('${l.id}', 'Disbursed')" style="padding:4px 8px; font-size:11px; background:#05cd99; color:white; border:none; border-radius:4px; cursor:pointer;">Mark Disbursed</button>
                </td>
            </tr>
        `;
    });
}

async function saveSingleSM() {
    const sm = {
        bank: document.getElementById('admin-sm-bank').value,
        product: document.getElementById('admin-sm-product').value,
        city: document.getElementById('admin-sm-city').value,
        name: document.getElementById('admin-sm-name').value,
        mobile: document.getElementById('admin-sm-mobile').value,
        email: document.getElementById('admin-sm-email').value,
        location: document.getElementById('admin-sm-location').value
    };

    await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sm)
    });

    alert('Sales Manager successfully add ho gaye!');
    refreshData();
}

async function saveBankPartner() {
    const bank = {
        name: document.getElementById('new-bank-name').value,
        roi: document.getElementById('new-bank-roi').value,
        payout: document.getElementById('new-bank-comm').value,
        link: document.getElementById('new-bank-link').value,
        portalId: document.getElementById('new-bank-portal-id').value,
        portalPass: document.getElementById('new-bank-portal-pass').value
    };

    await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bank)
    });

    alert('Bank details successfully save ho gayi!');
    refreshData();
}