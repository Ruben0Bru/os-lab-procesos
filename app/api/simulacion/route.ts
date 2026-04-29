export const dynamic = 'force-dynamic';
import { MotorRoundRobin } from '@/lib/MotorRR';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const modo = url.searchParams.get('modo');
    let xmlData = "";
    
    try {
        const response = await fetch('http://localhost:3000/api/procesos', { cache: 'no-store' });
        xmlData = await response.text();
    } catch (error) {
        console.error("Error conectando con el Recolector XML:", error);
        return new Response("Fallo de conexion interna", { status: 500 });
    }

    const procesosParsed: any[] = []; 
    const procesoRegex = /<Proceso>([\s\S]*?)<\/Proceso>/g;
    let match;

    while ((match = procesoRegex.exec(xmlData)) !== null) {
        const block = match[1];
        const extract = (tag: string) => {
            const reg = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>|<${tag}>(.*?)<\\/${tag}>`);
            const res = block.match(reg);
            return res ? (res[1] || res[2]).trim() : '';
        };

        procesosParsed.push({
            pid: extract('Pid'),
            nombre: extract('Nombre'),
            usuario: extract('Usuario'),
            descripcion: extract('Descripcion'),
            prioridad: parseInt(extract('Prioridad') || '0', 10),
        });
    }

    // Ruta estática para la carga inicial del frontend
    if (modo === 'catalogo') {
        return new Response(JSON.stringify(procesosParsed), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const th = 50; 
    const baseQuantum = 5;

    const stream = new ReadableStream({
        async start(controller) {
            const motor = new MotorRoundRobin(th, baseQuantum);
            motor.cargarProcesos(procesosParsed);

            await motor.iniciarSimulacion((estadoActual: any) => {
                const data = `data: ${JSON.stringify(estadoActual)}\n\n`;
                controller.enqueue(new TextEncoder().encode(data));
            });

            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}