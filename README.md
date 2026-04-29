# ⚙️ OS LAB PROCESOS

El proyecto corresponde a uno de los laboratorios de la materia "Sistemas Operativos", del programa de Ingeniería de Sistemas de la Universidad de Córdoba. 

## 📐 Arquitectura del Sistema

El proyecto está dividido en dos módulos lógicos principales que interactúan mediante un servicio web REST (XML) y Server-Sent Events (SSE) para el renderizado reactivo:

### 1. Sistema A: La Sonda (Recolector)
Actúa como un cliente de bajo nivel que interactúa con la API de Win32.
* **Extracción:** Ejecuta llamadas al sistema (`syscalls`) para capturar la tabla de procesos vivos en la RAM.
* **Muestreo Estratificado:** Filtra y clasifica los procesos por consumo de memoria, aislando los procesos nativos del SO (No Expulsivos / Prioridad 1) de las aplicaciones de usuario (Expulsivos / Prioridad 0).
* **Interfaz:** Serializa los datos en un esquema XML estricto y los expone mediante un servicio RESTful.

### 2. Sistema B: El Orquestador (Simulador Round Robin)
El motor principal de concurrencia y planificación.
* **Máquina de Estados:** Administra las colas dinámicas (Listos, Ejecución, Terminados) en memoria.
* **Concurrencia Real:** Implementa el módulo `worker_threads` de Node.js. Cada proceso despachado a la CPU corre en un hilo de ejecución aislado.
* **I/O Físico:** El consumo de los "Quantums" no es una simple resta matemática; cada hilo simula su ráfaga creando un archivo físico `.txt` en el disco y escribiendo su descripción carácter por carácter basado en una unidad de tiempo ($TH$) definida.
* **Visualización:** Transmite la telemetría iteración por iteración al frontend para renderizar el diagrama de estados, el listado final de ejecución y la gráfica de métricas ($TurnaRound$) en tiempo real.

## ⚠️ Aviso Crítico de Despliegue (Por qué no está en Vercel)

Esta aplicación **debe ejecutarse estrictamente en un entorno local** (Localhost). No está diseñada para ser desplegada en entornos Serverless o contenedores en la nube (como Vercel o Heroku) debido a las siguientes restricciones de hardware y SO:
1. **Llamadas al Kernel:** El Sistema A invoca ejecutables nativos de Windows (`tasklist`). Un entorno Linux en la nube arrojaría excepciones al carecer de estos binarios.
2. **I/O Bloqueante en Disco:** El algoritmo requiere permisos de escritura para generar archivos transaccionales en el disco físico, una operación prohibida en los sistemas de archivos de solo lectura (inmutables) del cómputo Serverless.
3. **Timeouts:** Los tiempos de espera asíncronos para simular el reloj de la CPU superarían los límites de ejecución máxima de las funciones de nube tradicionales.

## 🚀 Instalación y Ejecución

**Prerrequisitos:** Node.js (v18+) y un entorno Windows (para la extracción del Kernel).

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Ruben0Bru/os-lab-procesos
   cd os-lab-procesos
   ```

2. Instalar las dependencias (incluye Recharts para la visualización):
   ```bash
   npm install
   ```

3. Levantar el motor y el servidor local:
   ```bash
   npm run dev
   ```

4. Abrir el navegador en `http://localhost:3000`.

## 🔬 Telemetría y Archivos de Salida
Durante la simulación, observarás la creación dinámica de archivos `.txt` en la raíz del proyecto. Estos representan la I/O real ejecutada por los hilos de Node.js. Al finalizar, la interfaz generará el cuadro de mando matemático y el gráfico cartesiano de `Proceso vs TurnaRound`.

---
