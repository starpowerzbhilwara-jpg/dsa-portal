const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Upload Directory Setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root Route (Fix for rendering HTML on localhost:3000)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// DATABASE
let USERS = [
    { id: 1, name: "admin", role: "ADMIN", pass: "admin123", city: "Delhi", mobile: "9999999999", email: "admin@portal.com" },
    { id: 2, name: "ajay singh", role: "ADMIN", pass: "admin123", city: "Jaipur", mobile: "8888888888", email: "ajay@portal.com" }
];

let BANKS = [
    { id: 1, name: "HDFC Bank", roi: "10.5%", commission: 1.5, link: "https://www.hdfcbank.com", portalId: "HDFC_DSA_901", portalPass: "Hdfc@2026" },
    { id: 2, name: "ICICI Bank", roi: "11.0%", commission: 1.5, link: "https://www.icicibank.com", portalId: "ICICI_DSA_442", portalPass: "Icici@2026" },
    { id: 3, name: "Axis Bank", roi: "10.75%", commission: 1.8, link: "https://www.axisbank.com", portalId: "AXIS_DSA_771", portalPass: "Axis@2026" }
];

let SALES_MANAGERS = [
    { id: 1, bankName: "HDFC Bank", productType: "Personal Loan", city: "Jaipur", smName: "Vikram Sharma", smMobile: "9829012345", smEmail: "vikram.sharma@hdfc.com", location: "MI Road Branch, Jaipur" },
    { id: 2, bankName: "HDFC Bank", productType: "Home Loan", city: "Jaipur", smName: "Rakesh Verma", smMobile: "9829011223", smEmail: "rakesh.v@hdfc.com", location: "Vaishali Nagar Branch, Jaipur" },
    { id: 3, bankName: "ICICI Bank", productType: "Personal Loan", city: "Jaipur", smName: "Sunil Verma", smMobile: "9829099887", smEmail: "sunil.v@icicibank.com", location: "Tonk Road Branch, Jaipur" },
    { id: 4, bankName: "ICICI Bank", productType: "Business Loan", city: "Jaipur", smName: "Amitabh Sen", smMobile: "9829033445", smEmail: "amitabh.s@icicibank.com", location: "C-Scheme Branch, Jaipur" },
    { id: 5, bankName: "ICICI Bank", productType: "Personal Loan", city: "Delhi", smName: "Rajesh Kumar", smMobile: "9811098765", smEmail: "rajesh.k@icicibank.com", location: "Connaught Place Branch, Delhi" }
];

let LEADS = [];

// LOGIN API
app.post('/api/login', (req, res) => {
    const { name, pass } = req.body;
    if (!name || !pass) return res.status(400).json({ success: false, message: "User ID aur Password enter karein!" });
    
    const cleanName = name.trim().toLowerCase();
    const cleanPass = pass.trim();

    const user = USERS.find(u => u.name.toLowerCase() === cleanName && u.pass === cleanPass);
    if (user) return res.json({ success: true, user: { id: user.id, name: user.name, role: user.role, city: user.city || "Jaipur" } });

    if ((cleanName.includes('admin') || cleanName.includes('ajay')) && cleanPass === 'admin123') {
        return res.json({ success: true, user: { id: 1, name: name.trim(), role: "ADMIN", city: "Jaipur" } });
    }

    return res.status(401).json({ success: false, message: "Galat User ID ya Password!" });
});

// SALES MANAGERS SEARCH & DYNAMIC MATCHING API
app.get('/api/sm/search', (req, res) => {
    const city = (req.query.city || "").trim().toLowerCase();
    const product = (req.query.product || "").trim().toLowerCase();
    const bank = (req.query.bank || "").trim().toLowerCase();

    let matched = SALES_MANAGERS.filter(sm => {
        let cityMatch = !city || sm.city.toLowerCase().includes(city);
        let productMatch = !product || sm.productType.toLowerCase().includes(product);
        let bankMatch = !bank || sm.bankName.toLowerCase().includes(bank);
        return cityMatch && productMatch && bankMatch;
    });

    res.json({ success: true, managers: matched.length > 0 ? matched : SALES_MANAGERS });
});

// MATCH SPECIFIC SM FOR APPLICATION FORM
app.post('/api/sm/find-exact', (req, res) => {
    const { city, bank, product } = req.body;
    if (!city || !bank || !product) return res.json({ success: false, manager: null });

    const c = city.trim().toLowerCase();
    const b = bank.trim().toLowerCase();
    const p = product.trim().toLowerCase();

    let sm = SALES_MANAGERS.find(s => s.city.toLowerCase().includes(c) && s.bankName.toLowerCase().includes(b) && s.productType.toLowerCase().includes(p));
    if (!sm) sm = SALES_MANAGERS.find(s => s.city.toLowerCase().includes(c) && s.bankName.toLowerCase().includes(b));

    if (sm) res.json({ success: true, manager: sm });
    else res.json({ success: false, manager: null });
});

app.post('/api/sm/save', (req, res) => {
    const { id, bankName, productType, city, smName, smMobile, smEmail, location } = req.body;
    if (!smName || !smMobile) return res.status(400).json({ success: false, message: "SM Name & Mobile required!" });

    if (id) {
        let idx = SALES_MANAGERS.findIndex(s => s.id == id);
        if (idx !== -1) {
            SALES_MANAGERS[idx] = { id: parseInt(id), bankName, productType: productType || "Personal Loan", city, smName, smMobile, smEmail, location };
            return res.json({ success: true, message: "Sales Manager Details Updated!" });
        }
    }
    
    SALES_MANAGERS.push({
        id: SALES_MANAGERS.length + 1,
        bankName,
        productType: productType || "Personal Loan",
        city,
        smName,
        smMobile,
        smEmail,
        location: location || "Main Branch"
    });
    res.json({ success: true, message: "New Sales Manager Added Successfully!" });
});

app.get('/api/banks', (req, res) => res.json({ success: true, banks: BANKS }));
app.get('/api/leads', (req, res) => res.json({ success: true, leads: LEADS }));

// Start Server
const PORT = proceconst PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});