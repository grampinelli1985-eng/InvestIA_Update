import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const SECRET_KEY = 'investia_secret_key_ultra_secure';
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Inicializa Banco de Dados (JSON simplificado)
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2));
}

const getDB = () => JSON.parse(fs.readFileSync(DB_PATH));
const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// Rotas de Autenticação
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    const db = getDB();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password: hashedPassword,
        plan: 'PREMIUM',
        portfolio: [],
        alerts: []
    };

    db.users.push(newUser);
    saveDB(db);

    const token = jwt.sign({ id: newUser.id }, SECRET_KEY, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ user: userWithoutPassword, token });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const db = getDB();
    const user = db.users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
});

// Middleware de Proteção
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Acesso negado.' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.id;
        next();
    } catch (e) {
        res.status(401).json({ message: 'Token inválido.' });
    }
};

// Rotas de Dados (Salvamento e Recuperação)
app.get('/api/user/data', authenticate, (req, res) => {
    const db = getDB();
    const user = db.users.find(u => u.id === req.userId);
    res.json({
        portfolio: user.portfolio || [],
        dividends: user.dividends || [],
        alerts: user.alerts || []
    });
});

app.post('/api/user/save', authenticate, (req, res) => {
    const { portfolio, dividends, alerts } = req.body;
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === req.userId);

    if (userIndex === -1) return res.status(404).json({ message: 'Usuário não encontrado.' });

    db.users[userIndex].portfolio = portfolio || [];
    db.users[userIndex].dividends = dividends || [];
    db.users[userIndex].alerts = alerts || [];

    saveDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Backend Investia rodando em http://localhost:${PORT}`);
});
