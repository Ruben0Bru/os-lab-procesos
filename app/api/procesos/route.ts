export const dynamic = 'force-dynamic';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  try {
    const { stdout } = await execAsync('tasklist /V /FO CSV');
    const lines = stdout.trim().split('\n').slice(1);

    let procesos = lines.map(line => {
      const cols = line.split('","').map(col => col.replace(/(^"|"$)/g, ''));
      if (cols.length < 7) return null;

      const memoriaStr = cols[4].replace(/\D/g, ''); 
      const memoria = parseInt(memoriaStr, 10) || 0;
      const usuario = cols[6].toUpperCase();
      const pidNum = parseInt(cols[1], 10);

      //PID bajo (< 1500) o usuarios del sistema = Prioridad 1 (No Expulsivo)
      const esSO = pidNum < 1500 || usuario.includes('SYSTEM') || usuario.includes('AUTHORITY') || usuario.includes('WINDOW MANAGER');
      const prioridad = esSO ? 1 : 0;

      return {
        pid: cols[1],
        nombre: cols[0],
        usuario: cols[6],
        memoria: memoria,
        descripcion: `Init_secuencia_para_proceso_${cols[1]}`, 
        prioridad: prioridad
      };
    }).filter(p => p !== null);

    // Muestreo Estratificado para asegurar datos mixtos reales
    const procesosSO = procesos.filter(p => p?.prioridad === 1).sort((a: any, b: any) => b.memoria - a.memoria).slice(0, 5);
    const procesosUsuario = procesos.filter(p => p?.prioridad === 0).sort((a: any, b: any) => b.memoria - a.memoria).slice(0, 5);
    
    // Unimos y ordenamos por memoria total para cumplir el criterio de selección del usuario
    const topProcesos = [...procesosSO, ...procesosUsuario].sort((a: any, b: any) => b.memoria - a.memoria);

    // Serialización XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Catalogo id="1" nombre="TopMemory_Snapshot">\n`;
    topProcesos.forEach(p => {
      xml += `  <Proceso>\n`;
      xml += `    <Pid>${p?.pid}</Pid>\n`;
      xml += `    <Nombre><![CDATA[${p?.nombre}]]></Nombre>\n`;
      xml += `    <Usuario><![CDATA[${p?.usuario}]]></Usuario>\n`;
      xml += `    <Descripcion><![CDATA[${p?.descripcion}]]></Descripcion>\n`;
      xml += `    <Prioridad>${p?.prioridad}</Prioridad>\n`;
      xml += `  </Proceso>\n`;
    });
    xml += `</Catalogo>`;

    return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });

  } catch (error) {
    console.error("Error en Syscall:", error);
    return new Response(`<Error>Fallo en recoleccion</Error>`, { status: 500 });
  }
}