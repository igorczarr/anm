require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Banco de Dados PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Testar a conexão com o banco de dados
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
    } else {
        console.log('Conectado ao banco de dados PostgreSQL com sucesso!');
        release();
    }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS, Imagens, Fontes)
app.use(express.static(__dirname));

// Rotas da Aplicação
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/patrocinio', (req, res) => {
    res.sendFile(path.join(__dirname, 'patrocinio.html'));
});

app.get('/projeto', (req, res) => {
    res.sendFile(path.join(__dirname, 'projeto.html'));
});

// Rota de exemplo para testar o banco de dados
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() as current_time');
        res.json({
            success: true,
            message: 'Conexão com o banco de dados ativa!',
            time: result.rows[0].current_time
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erro ao consultar o banco de dados' });
    }
});

// Fallback para qualquer outra rota não encontrada (retorna para a home)
app.use((req, res) => {
    res.redirect('/');
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta http://localhost:${port}`);
});
