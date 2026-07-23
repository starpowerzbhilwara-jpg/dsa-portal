const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Data Store (Or Connect MongoDB/MySQL Here)
let leads = [
    { id: '1', leadId: 'LD101', name: 'Ramesh Sharma', mobile: '9829012345', city: 'Jaipur', product: 'Personal Loan', amount: 500000, bank: 'HDFC Bank', status: 'Bank Login Submitted' }
];

let sms = [
    { id: '1', bank: 'HDFC Bank', product: 'Personal Loan', city: 'Jaipur', name: 'Vikram Sharma', mobile: '9829011223', email: 'vikram@hdfc.com', location: 'MI Road Branch' }
];

let banks = [
    { id: '1', name: 'HDFC Bank', roi: '10.5%', payout: '1.5', link: 'https://hdfcbank.com', portalId: 'DSA_JP_01', portalPass: 'Pass@123' }
];

// APIs
app.post('/api/login', (req, res) => {
    const { name, pass } = req.body;
    if (name === 'admin' && pass === 'admin') {
        return res.json({ success: true, user: { name: 'Admin User', role: 'ADMIN' } });
    }
    res.json({ success: true, user: { name: name || 'Staff Member', role: 'STAFF' } });
});

app.get('/api/leads', (req, res) => res.json(leads));
app.post('/api/leads', (req, res) => {
    const newLead = { id: Date.now().toString(), ...req.body };
    leads.push(newLead);
    io.emit('data_update');
    res.json({ success: true, lead: newLead });
});

app.patch('/api/leads/:id', (req, res) => {
    const lead = leads.find(l => l.id === req.params.id);
    if (lead) {
        Object.assign(lead, req.body);
        io.emit('data_update');
    }
    res.json({ success: true });
});

app.get('/api/sms', (req, res) => res.json(sms));
app.post('/api/sms', (req, res) => {
    const newSM = { id: Date.now().toString(), ...req.body };
    sms.push(newSM);
    io.emit('data_update');
    res.json({ success: true, sm: newSM });
});

app.get('/api/banks', (req, res) => res.json(banks));
app.post('/api/banks', (req, res) => {
    const newBank = { id: Date.now().toString(), ...req.body };
    banks.push(newBank);
    io.emit('data_update');
    res.json({ success: true, bank: newBank });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`DSA CRM running on port ${PORT}`));