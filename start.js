import net from 'node:net';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trova una porta libera a partire da startingPort (default 5199)
function findFreePort(startingPort = 5199) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.on('error', () => {
      // Porta occupata: prova con la successiva
      findFreePort(startingPort + 1).then(resolve);
    });

    server.listen(startingPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function start() {
  const preferredPort = parseInt(process.env.PORT, 10) || 5199;
  const freePort = await findFreePort(preferredPort);

  console.log('\n============================================================');
  console.log('  📺 STUDIO TV — Avvio Locale su Porta Libera');
  console.log(`  🌐 Server locale:  http://localhost:${freePort}/`);
  console.log('  🚀 Apertura automatica del browser in corso...');
  console.log('============================================================\n');

  const viteBin = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');

  const child = spawn(process.execPath, [viteBin, '--port', String(freePort), '--open'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    console.error('Errore nell’avvio di Vite:', err);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`Server terminato con codice: ${code}`);
    }
  });

  const cleanup = () => {
    if (child && !child.killed) {
      child.kill();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start();
