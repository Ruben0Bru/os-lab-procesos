'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProcesoSimulado {
    pid: string | number;
    nombre?: string;
    tl?: number;
    tr?: number;
    tf?: number;
    prioridad?: number;
}

interface EstadoSimulador {
    ejecucion: ProcesoSimulado | null;
    listos: ProcesoSimulado[];
    terminados: ProcesoSimulado[];
}

export default function DashboardSimulador() {
    const [estado, setEstado] = useState<EstadoSimulador>({ 
        ejecucion: null, 
        listos: [], 
        terminados: [] 
    });
    const [simulando, setSimulando] = useState(false);
    const [simulacionFinalizada, setSimulacionFinalizada] = useState(false);

    // Carga inicial del catálogo - Bypasseando el caché de Next.js
    useEffect(() => {
        const cargarCatalogo = async () => {
            try {
                const response = await fetch('/api/simulacion?modo=catalogo', { cache: 'no-store' }); 
                const data = await response.json();
                setEstado(prev => ({ ...prev, listos: data }));
            } catch (error) {
                console.error("Error cargando catálogo inicial:", error);
            }
        };
        cargarCatalogo();
    }, []);

    const iniciar = () => {
        setSimulando(true);
        setSimulacionFinalizada(false);
        setEstado({ ejecucion: null, listos: [], terminados: [] });
        
        const sse = new EventSource('/api/simulacion');

        sse.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.evento === 'FIN_SIMULACION') {
                sse.close();
                setSimulando(false);
                setSimulacionFinalizada(true);
                setEstado(prev => ({ ...prev, terminados: data.terminados, ejecucion: null, listos: [] }));
            } else {
                setEstado({
                    ejecucion: data.ejecucion,
                    listos: data.listos,
                    terminados: data.terminados
                });
            }
        };

        sse.onerror = () => {
            console.error("Error en el túnel SSE");
            sse.close();
            setSimulando(false);
        };
    };

    const noExpulsivos = estado.terminados.filter(p => p.prioridad === 1);

    // Formateo de datos para Recharts según el PDF (p1, p2, p3...)
    const chartData = estado.terminados.map((p, index) => ({
        name: `p${index + 1}`,
        pid: p.pid,
        tr: p.tr
    }));

    return (
        <div className="p-8 min-h-screen bg-gray-900 text-white font-sans">
            <button 
                onClick={iniciar} 
                disabled={simulando} 
                className="mb-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg disabled:opacity-50 transition-all"
            >
                {simulando ? 'Simulando...' : 'Iniciar Simulación'}
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 border-b border-white/20 pb-2">Listos</h2>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {estado.listos.map((p, i) => (
                            <div key={`${p.pid}-${i}`} className="px-4 py-3 bg-green-500/20 border border-green-500/30 rounded-lg flex justify-between">
                                <span>Proceso {p.pid}</span>
                                <span className="text-xs text-green-300">P.R: {p.prioridad}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 border-b border-white/20 pb-2">Ejecución (CPU)</h2>
                    {estado.ejecucion ? (
                        <div className="px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg animate-pulse flex justify-between">
                            <span>Proceso {estado.ejecucion.pid} escribiendo...</span>
                            <span className="text-xs text-red-300">P.R: {estado.ejecucion.prioridad}</span>
                        </div>
                    ) : (
                        <div className="text-gray-500 italic">CPU Inactiva</div>
                    )}
                </div>

                <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-xl">
                    <h2 className="text-xl font-bold mb-4 border-b border-white/20 pb-2">Terminados</h2>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {estado.terminados.map((p, i) => (
                            <div key={`${p.pid}-${i}`} className="px-4 py-3 bg-gray-500/20 border border-gray-500/30 rounded-lg flex justify-between">
                                <span>Proceso {p.pid}</span>
                                <span className="text-xs text-gray-400">TR: {p.tr}ms</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {simulacionFinalizada && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-xl overflow-x-auto">
                        <h2 className="text-xl font-bold mb-4">Listado de procesos (No Expulsivos)</h2>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/20">
                                    <th className="p-2">P (PID)</th>
                                    <th className="p-2">T.L</th>
                                    <th className="p-2">P.R</th>
                                    <th className="p-2">T.R</th>
                                    <th className="p-2">T.F</th>
                                </tr>
                            </thead>
                            <tbody>
                                {noExpulsivos.length > 0 ? noExpulsivos.map((p, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-2">{p.pid}</td>
                                        <td className="p-2">{p.tl}</td>
                                        <td className="p-2">{p.prioridad}</td>
                                        <td className="p-2">{p.tr}</td>
                                        <td className="p-2">{p.tf}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500">Ningún proceso No Expulsivo identificado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Proceso vs TurnaRound</h2>
                        <div className="w-full" style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#ccc" tick={{ fill: '#ccc' }} />
                                    <YAxis stroke="#ccc" tick={{ fill: '#ccc' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                    <Line type="monotone" dataKey="tr" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}