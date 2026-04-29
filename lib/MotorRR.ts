import { Worker } from 'worker_threads';
import path from 'path';

export class MotorRoundRobin {
    public listos: any[] = [];
    public terminados: any[] = [];
    private th: number;
    private baseQuantum: number;

    constructor(th: number, baseQuantum: number) {
        this.th = th; // Tiempo de espera en ms [cite: 167]
        this.baseQuantum = baseQuantum;
    }

    // 1. Carga inicial y cálculo del Tiempo de Llegada (T.L)
    cargarProcesos(procesosXMLParseados: any[]) {
        procesosXMLParseados.forEach((p, index) => {
            let tiempoLlegada = 0;
            // Regla de T.L: Si LISTO es vacío es 0, sino, T.L del último + 1 
            if (this.listos.length > 0) {
                const ultimoProceso = this.listos[this.listos.length - 1];
                tiempoLlegada = ultimoProceso.tl + 1;
            }

            this.listos.push({
                ...p,
                tl: tiempoLlegada,
                tf: 0,
                tr: 0,
                ejecuciones: 0,
                indexActual: 0 // Puntero de lectura de la descripción
            });
        });
    }

    // 2. Ejecución del Context Switch (Despachador)
    despacharWorker(proceso: any, quantumAsignado: number): Promise<any> {
        return new Promise((resolve, reject) => {
            const workerPath = path.join(process.cwd(), 'workers', 'procesoWorker.js');
            const worker = new Worker(workerPath);

            // Pasamos el contexto de ejecución al hilo
            worker.postMessage({
                pid: proceso.pid,
                descripcion: proceso.descripcion,
                th: this.th,
                quantum: quantumAsignado,
                indexActual: proceso.indexActual
            });

            worker.on('message', (msg) => {
                worker.terminate(); // Destruimos el hilo al liberar la CPU para evitar memory leaks
                resolve(msg);
            });
            worker.on('error', reject);
        });
    }

    // 3. Bucle Principal de la CPU
    async iniciarSimulacion(onTick: (estadoActual: any) => void) {
    while (this.listos.length > 0) {
        const procesoActual = this.listos.shift(); 
        
        // Emitimos el estado exacto en el instante en que el proceso entra a CPU
        onTick({
            evento: 'CAMBIO_CONTEXTO',
            ejecucion: procesoActual,
            listos: [...this.listos], 
            terminados: [...this.terminados]
        });

        const quantumEfectivo = procesoActual.prioridad === 1 
            ? procesoActual.descripcion.length - procesoActual.indexActual 
            : this.baseQuantum;

        const resultado = await this.despacharWorker(procesoActual, quantumEfectivo);

        procesoActual.ejecuciones++; 
        procesoActual.indexActual += resultado.caracteresEscritos;

        if (resultado.terminado) {
            procesoActual.tf = this.baseQuantum * procesoActual.ejecuciones; 
            procesoActual.tr = procesoActual.tf - procesoActual.tl; 
            this.terminados.push(procesoActual);
        } else if (procesoActual.prioridad === 0) {
            this.listos.push(procesoActual);
        }
    }
    
    // Señal de finalización para cerrar el Stream
    onTick({ evento: 'FIN_SIMULACION', terminados: [...this.terminados] });
}
}