import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

dotenv.config();

const port = process.env.PORT || 3000;

// 현재 파일의 URL에서 디렉토리 경로를 추출
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(__dirname));

app.get('/config.js', (req, res) => {
    const apiBaseUrl = process.env.API_BASE_URL || '';
    res.set('Cache-Control', 'no-store');
    res.type('application/javascript').send(
        `window.__APP_CONFIG__ = ${JSON.stringify({
            API_BASE_URL: apiBaseUrl,
        })};`,
    );
});

// 컨테이너 및 로드밸런서 상태 확인용 Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
    });
});

app.get('/', (req, res) => {
    res.redirect('/html/index.html');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});