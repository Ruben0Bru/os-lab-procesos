const { parentPort } = require('worker_threads');
const fs = require('fs/promises');
const path = require('path');

// Función para simular el ciclo de reloj de la CPU bloqueando el hilo actual
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// El Worker entra en estado de 'Espera' escuchando los mensajes del Kernel (Hilo Principal)
parentPort.on('message', async (data) => {
    // Desempaquetamos el contexto de ejecución enviado por el planificador
    const { pid, descripcion, th, quantum, indexActual } = data;
    
    // Definimos la ruta del archivo de salida (I/O físico)
    const fileName = path.join(process.cwd(), `proceso_${pid}.txt`);

    let caracteresEscritos = 0;

    // Ejecutamos la Ráfaga hasta agotar el Quantum o terminar la descripción
    for (let i = 0; i < quantum; i++) {
        const charIndex = indexActual + i;
        
        // Criterio de liberación: Si ya leímos toda la descripción, rompemos el ciclo
        if (charIndex >= descripcion.length) break; 

        const char = descripcion[charIndex];

        // 1. Simular el tiempo de procesamiento (TH) de este carácter específico
        await sleep(th);

        // 2. Ejecutar la actividad de I/O
        await fs.appendFile(fileName, char);
        caracteresEscritos++;
    }

    // Evaluamos si el proceso culminó su actividad en su totalidad (Regla 'a' del documento)
    const terminado = (indexActual + caracteresEscritos) >= descripcion.length;

    // Generamos una interrupción por software enviando la telemetría de vuelta al Kernel
    parentPort.postMessage({
        pid,
        caracteresEscritos,
        terminado
    });
});